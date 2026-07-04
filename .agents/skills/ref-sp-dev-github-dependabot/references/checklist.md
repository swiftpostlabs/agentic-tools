# Review Checklist

- The config file is `.github/dependabot.yml` and starts with `version: 2`.
- Each `updates` block owns one clear ecosystem and directory boundary.
- Schedules, PR limits, and grouping reflect actual team review capacity.
- `ignore` rules are narrow and justified rather than hiding work indefinitely.
- GitHub Actions updates are enabled when the repo depends on external actions or reusable workflows.
- Private registries are configured through `registries` plus secrets rather than inline credentials.
- Fork behavior and target-branch behavior are understood where relevant.
