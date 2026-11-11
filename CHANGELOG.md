# Changelog

All notable changes to this project will be documented in this file. Entries are generated from
conventional commits by `yarn release`.

## [0.2.0](https://github.com/swiftpostlabs/agentic-tools/compare/v0.1.0...v0.2.0) (2026-11-11)

### ⚠ BREAKING CHANGES

* **cli:** `-f.`, `-t<path>`, and `-w<path>` no longer work. Use
  `-f .`, or `--from=.`. This reverses the attached-value tests from 50c5466.
* the CLI no longer runs on Python. Python projects get
  the same agentic-tools command through the shim, which needs no Node
  install of its own.

* Remove the Python implementation and the drifted .mjs port ([9767804](https://github.com/swiftpostlabs/agentic-tools/commit/9767804bb915aa0da6729b0e63d3935305374565))

### Features

* **cli:** Add the TypeScript agentic-tools entry point ([c5e186a](https://github.com/swiftpostlabs/agentic-tools/commit/c5e186a8fb991c38a1ccf8662705d0395f6beab9))
* **cli:** Refuse values attached to short options ([ba7247a](https://github.com/swiftpostlabs/agentic-tools/commit/ba7247a986ce52b988cf78ad70f0edb95fcfa7ef))
* **export:** Port the chat-assistant export to TypeScript ([e0ba278](https://github.com/swiftpostlabs/agentic-tools/commit/e0ba2785eada921687984d7f16e571f534fbc4c4))
* **plugin:** Port plugin manifest sync to TypeScript ([386d495](https://github.com/swiftpostlabs/agentic-tools/commit/386d495720b63bdd47ca48d74102b1977afeeb61))
* **policy:** Port policy sync to TypeScript ([714f431](https://github.com/swiftpostlabs/agentic-tools/commit/714f431ecd292ea5554ad939bb175eeeeea1b816))
* **python:** Ship the Node CLI to Python projects through a pyright-style shim ([7f342e1](https://github.com/swiftpostlabs/agentic-tools/commit/7f342e1b5db5e77c74386be5785f5cdd5f6d36d7))
* **scripts:** Check that Node and Bun give identical output ([538b3c1](https://github.com/swiftpostlabs/agentic-tools/commit/538b3c12c15e4c2f8e7595ed1be80cbb7109efe6))
* **scripts:** Port version-drift and assistant projection scripts to .mts ([50f7e10](https://github.com/swiftpostlabs/agentic-tools/commit/50f7e1051ee2d1635e1fda68a42ce2660e827be2))
* **skills:** Add tool-sp-recover-sessions for restoring sessions after a reboot ([fb9b34e](https://github.com/swiftpostlabs/agentic-tools/commit/fb9b34eb75995c93c0f1381bdb41e38ee1fde4ea))
* **skills:** Port skill-bundled Python scripts to standalone .mts ([ae92e7d](https://github.com/swiftpostlabs/agentic-tools/commit/ae92e7d904cda5d7d368237a29f375bcd24623b5))
* **skills:** Port skills management to TypeScript ([8cd332b](https://github.com/swiftpostlabs/agentic-tools/commit/8cd332b20946d47d050b35d3a5773a2ca278acac))

### Bug Fixes

* **cli:** Keep command output independent of the environment ([1483d68](https://github.com/swiftpostlabs/agentic-tools/commit/1483d68e187dafe986a0f7315afe58c134227082))
* **cli:** Validate every command level strictly with node:util parseArgs ([50c5466](https://github.com/swiftpostlabs/agentic-tools/commit/50c546699e35cb21544c17487be42a941dc1b0de))
* **release:** Point the postbump hook at the moved CLI entry ([e3261f3](https://github.com/swiftpostlabs/agentic-tools/commit/e3261f3be860188af9820b188d988c0c1e6fcd2c))
* **skills:** Detect EPERM without instanceof so the junction fallback runs ([b1e3dbd](https://github.com/swiftpostlabs/agentic-tools/commit/b1e3dbda45e360843ace3abfe5d034267938e6db))

## [0.1.0] - 2026-05-14

### Baseline

- Baseline changelog entry recorded when the repository adopted explicit version-management tracking.
- A root `VERSION` file as the single source of truth for repo versioning, a tag-triggered release
  workflow, and npm repository metadata for trusted publishing.
