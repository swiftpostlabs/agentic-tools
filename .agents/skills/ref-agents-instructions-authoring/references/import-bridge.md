# Import Bridge Patterns

## Recommended default: single source of truth plus thin stubs

- Put the real repo guidance in one file.
- Route the other provider entry files back to that source-of-truth file.
- Keep the provider entry files short unless the provider has a real bootstrap or compatibility requirement.

This is the default pattern for most multi-provider repos because it minimizes drift.

## Good fit for this pattern

- The repo supports Copilot plus Gemini or Claude.
- The other providers can import or reference another file cleanly.
- The workflow, policy, and skill-routing guidance should be the same across providers.

## When to add provider-specific text

- The provider requires a bootstrapping line in its entry file.
- The provider has a limitation or behavior that materially changes how the repo should be operated.
- The provider needs one routing note that cannot live solely in the shared source file.

When that happens:

- keep the provider-specific text short,
- say only the provider-specific exception,
- and then route back to the source of truth.

## Rare fallback: split-source instruction systems

- Use this only when two providers cannot consume the same shared source or need meaningfully different instruction structures.
- If split-source files are unavoidable, document which file owns which rule categories and how parity is maintained.
- Prefer a maintenance workflow or generated bridge over hand-maintaining two long instruction bodies forever.
