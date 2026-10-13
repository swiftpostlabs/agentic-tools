"""Hatch build hook: stage the Node CLI and its runtime dependencies inside the wheel.

The wheel carries the TypeScript sources rather than compiled output. Node strips types itself for
any file outside node_modules, and site-packages is outside it, so building from a git checkout
needs no TypeScript compiler. Runtime npm dependencies come from the checkout's node_modules when it
has one, and are otherwise installed at their yarn.lock versions with the npm bundled in
nodejs-wheel-binaries.
"""

import json
import re
import shutil
from pathlib import Path
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

PAYLOAD = "agentic_tools/js"


def locked_version(root: Path, name: str) -> str | None:
    """The version yarn.lock resolved for a direct dependency, if recorded."""
    lockfile = root / "yarn.lock"
    if not lockfile.is_file():
        return None
    match = re.search(
        rf'^"?{re.escape(name)}@[^\n]*:\n\s+version "([^"]+)"',
        lockfile.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    return match.group(1) if match else None


def is_runtime_source(path: Path) -> bool:
    return not path.name.endswith(".test.ts") and path.name != "testFixtures.ts"


class JsPayloadBuildHook(BuildHookInterface[Any]):
    PLUGIN_NAME = "custom"

    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        if self.target_name != "wheel":
            return

        root = Path(self.root)
        staging = root / "build" / "js-payload"
        shutil.rmtree(staging, ignore_errors=True)
        (staging / "node_modules").mkdir(parents=True)

        sources = [*(root / "src").rglob("*.ts"), *(root / "src").rglob("*.mts")]
        for source in sources:
            relative = source.relative_to(root)
            if is_runtime_source(relative):
                (staging / relative).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, staging / relative)
        shutil.copy2(root / "package.json", staging / "package.json")

        manifest = json.loads((root / "package.json").read_text(encoding="utf-8"))
        missing: list[str] = []
        for name, spec in manifest.get("dependencies", {}).items():
            installed = root / "node_modules" / name
            if (installed / "package.json").is_file():
                shutil.copytree(installed, staging / "node_modules" / name)
            else:
                missing.append(f"{name}@{locked_version(root, name) or spec}")
        if missing:
            self.install_with_npm(staging, missing)

        build_data["force_include"][str(staging)] = PAYLOAD
        build_data["force_include"][str(root / ".agents" / "skills")] = f"{PAYLOAD}/.agents/skills"

    def install_with_npm(self, staging: Path, packages: list[str]) -> None:
        from nodejs_wheel import npm

        scratch = staging.parent / "js-install"
        shutil.rmtree(scratch, ignore_errors=True)
        scratch.mkdir(parents=True)
        result = npm(
            [
                "install",
                "--prefix",
                str(scratch),
                "--no-save",
                "--no-package-lock",
                "--omit=dev",
                "--ignore-scripts",
                "--no-audit",
                "--no-fund",
                *packages,
            ]
        )
        if result != 0:
            raise RuntimeError(f"npm could not install {', '.join(packages)} (exit {result})")
        for installed in (scratch / "node_modules").iterdir():
            if not installed.name.startswith("."):
                shutil.move(str(installed), staging / "node_modules" / installed.name)
        shutil.rmtree(scratch, ignore_errors=True)
