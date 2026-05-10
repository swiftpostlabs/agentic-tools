# Review Checklist

- External or untrusted data is validated at runtime before the rest of the code treats it as trusted.
- `any`, unchecked assertions, and wide casts are rare and justified.
- Types live close to the feature that owns them unless genuine sharing forces extraction.
- In multi-package repos, feature code stays under the owning package's `src/<feature>/` layout rather than under a global shared-types dump.
- Complex unions, generics, or mapped types clarify the domain instead of obscuring it.
- The final code remains readable to an engineer who did not write the original types.
