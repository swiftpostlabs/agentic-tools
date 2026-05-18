# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Added a root `VERSION` file as the single source of truth for repo versioning.
- Added a tag-triggered GitHub Actions release workflow for publishing Python and npm packages.
- Added npm repository metadata needed for GitHub-based trusted publishing.
- Added `ref-dev-package-management` guidance for multi-manifest versioning and changelog workflow.

### Changed

- Replaced the repo's custom version-writing commands with a Commitizen-led `release-prepare` and `release-publish` workflow for stable releases.
- Reduced the old version-management helper to drift checking instead of version mutation, and renamed it to `scripts/check_version_drift.py`.

## [0.1.0] - 2026-05-14

### Baseline

- Baseline changelog entry recorded when the repository adopted explicit version-management tracking.
