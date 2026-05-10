# Config Patterns

## Good default shape

- Start with one update block per ecosystem.
- Use `weekly` schedules and a modest open PR limit.
- Group obvious low-risk updates such as development dependencies or GitHub Actions refs.

## When to split update blocks

- Different manifest roots need different schedules.
- One ecosystem needs different labels, registries, or branch targets.
- A monorepo has truly separate teams or review cadences.

## When to group updates

- The repo gets too many low-value PRs for small compatible updates.
- Several directories belong to one review unit.
- GitHub Actions refs should land together instead of one PR per action bump.

## When to avoid over-grouping

- Major upgrades need focused review.
- A single ecosystem spans unrelated products or services.
- One noisy package repeatedly causes breakage and should remain isolated.
