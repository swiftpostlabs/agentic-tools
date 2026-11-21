# Gemini Output

- Output file: `.aiexclude`
- Content source:
  - `protectedFiles`
  - `excludedFiles`
- The file stays at the repo root.
- `!pattern` exceptions are written as-is. Whether Gemini Code Assist honours negation in
  `.aiexclude` is unverified; if it doesn't, the excepted file stays excluded, the safe direction.
- If Gemini output is disabled in `services`, the managed `.aiexclude` file is removed.
- This repo does not use a separate Gemini-only ignore filename in place of `.aiexclude`.
