#!/usr/bin/env python3
"""Aggregate skill eval grading.json files into a compact summary."""

import argparse
import json
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TypedDict
from typing import cast


class ConfigurationSummary(TypedDict):
    runs: int
    passed: int
    failed: int
    total: int
    pass_rate_mean: float
    pass_rate_stdev: float
    time_seconds_mean: float | None
    time_seconds_stdev: float | None


class EvalSummary(TypedDict):
    runs: list[dict[str, object]]
    configurations: dict[str, ConfigurationSummary]


@dataclass(frozen=True)
class RunResult:
    path: str
    configuration: str
    passed: int
    failed: int
    total: int
    pass_rate: float
    time_seconds: float | None

    def to_json_object(self) -> dict[str, object]:
        return {
            "path": self.path,
            "configuration": self.configuration,
            "passed": self.passed,
            "failed": self.failed,
            "total": self.total,
            "pass_rate": self.pass_rate,
            "time_seconds": self.time_seconds,
        }


def read_json(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return cast(dict[str, object], value)


def as_int(value: object, default: int = 0) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) else default


def as_float(value: object, default: float = 0.0) -> float:
    return float(value) if isinstance(value, int | float) and not isinstance(value, bool) else default


def optional_float(value: object) -> float | None:
    return float(value) if isinstance(value, int | float) and not isinstance(value, bool) else None


def infer_configuration(root: Path, grading_path: Path) -> str:
    relative_parts = grading_path.parent.relative_to(root).parts
    if not relative_parts:
        return "unknown"

    known = {"baseline", "new_skill", "old_skill", "with_skill", "without_skill"}
    for part in reversed(relative_parts):
        if part in known:
            return part
    for part in reversed(relative_parts):
        if not part.startswith("run-") and not part.startswith("eval-"):
            return part
    return relative_parts[-1]


def load_run(root: Path, grading_path: Path) -> RunResult:
    grading = read_json(grading_path)
    summary = grading.get("summary")
    if not isinstance(summary, dict):
        raw_expectations = grading.get("expectations", [])
        expectations = cast(list[object], raw_expectations) if isinstance(raw_expectations, list) else []
        passed = sum(1 for item in expectations if isinstance(item, dict) and item.get("passed") is True)
        total = len(expectations)
        failed = total - passed
        pass_rate = passed / total if total else 0.0
    else:
        summary_mapping = cast(dict[str, object], summary)
        passed = as_int(summary_mapping.get("passed"))
        failed = as_int(summary_mapping.get("failed"))
        total = as_int(summary_mapping.get("total"), passed + failed)
        pass_rate = as_float(summary_mapping.get("pass_rate"), passed / total if total else 0.0)

    timing = grading.get("timing")
    time_seconds = None
    if isinstance(timing, dict) and "total_duration_seconds" in timing:
        time_seconds = optional_float(cast(dict[str, object], timing).get("total_duration_seconds"))
    else:
        timing_path = grading_path.parent / "timing.json"
        if timing_path.is_file():
            timing_json = read_json(timing_path)
            if "total_duration_seconds" in timing_json:
                time_seconds = optional_float(timing_json.get("total_duration_seconds"))

    return RunResult(
        path=str(grading_path.relative_to(root)),
        configuration=infer_configuration(root, grading_path),
        passed=passed,
        failed=failed,
        total=total,
        pass_rate=pass_rate,
        time_seconds=time_seconds,
    )


def summarize(results: list[RunResult]) -> EvalSummary:
    by_configuration: dict[str, list[RunResult]] = {}
    for result in results:
        by_configuration.setdefault(result.configuration, []).append(result)

    configurations: dict[str, ConfigurationSummary] = {}
    for configuration, config_results in sorted(by_configuration.items()):
        pass_rates = [result.pass_rate for result in config_results]
        times = [result.time_seconds for result in config_results if result.time_seconds is not None]
        configurations[configuration] = {
            "runs": len(config_results),
            "passed": sum(result.passed for result in config_results),
            "failed": sum(result.failed for result in config_results),
            "total": sum(result.total for result in config_results),
            "pass_rate_mean": statistics.fmean(pass_rates) if pass_rates else 0.0,
            "pass_rate_stdev": statistics.stdev(pass_rates) if len(pass_rates) > 1 else 0.0,
            "time_seconds_mean": statistics.fmean(times) if times else None,
            "time_seconds_stdev": statistics.stdev(times) if len(times) > 1 else None,
        }

    return {
        "runs": [result.to_json_object() for result in results],
        "configurations": configurations,
    }


def render_markdown(summary: EvalSummary) -> str:
    lines = ["# Skill Eval Summary", "", "| Configuration | Runs | Pass Rate | Time |", "| --- | ---: | ---: | ---: |"]
    for configuration, data in summary["configurations"].items():
        pass_rate = data["pass_rate_mean"] * 100
        pass_stdev = data["pass_rate_stdev"] * 100
        time_mean = data["time_seconds_mean"]
        time_stdev = data["time_seconds_stdev"]
        time_text = "n/a" if time_mean is None else f"{time_mean:.1f}s +/- {(time_stdev or 0.0):.1f}s"
        lines.append(f"| {configuration} | {data['runs']} | {pass_rate:.1f}% +/- {pass_stdev:.1f}% | {time_text} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Aggregate grading.json files from a skill eval workspace")
    parser.add_argument("workspace", type=Path, help="Directory containing eval run outputs")
    parser.add_argument("--output", type=Path, help="Optional path for summary JSON")
    parser.add_argument("--markdown", type=Path, help="Optional path for a Markdown summary")
    args = parser.parse_args()

    workspace = args.workspace.resolve()
    if not workspace.is_dir():
        print(f"Workspace not found: {workspace}", file=sys.stderr)
        return 2

    grading_paths = sorted(workspace.rglob("grading.json"))
    if not grading_paths:
        print(f"No grading.json files found under {workspace}", file=sys.stderr)
        return 1

    try:
        results = [load_run(workspace, path) for path in grading_paths]
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Failed to aggregate eval results: {error}", file=sys.stderr)
        return 1

    summary = summarize(results)
    summary_json = json.dumps(summary, indent=2)
    if args.output:
        args.output.write_text(summary_json + "\n", encoding="utf-8")
    else:
        print(summary_json)

    if args.markdown:
        args.markdown.write_text(render_markdown(summary), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())