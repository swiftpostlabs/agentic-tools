# Review Checklist

- `deno.json` owns tasks, config, and dependency conventions.
- Any retained `tsconfig.json` or ESLint ownership is explicit and scoped to the correct files.
- Hybrid repos keep Deno-owned files and Node-owned files clearly separated.
- `nodeModulesDir`, `deno.enablePaths`, and npm-backed tooling behavior are configured intentionally.
- Permissions are explicit and scoped to the actual runtime needs.
- Environment loading and permission debugging strategy are deliberate when the workflow needs them.
- Dependency specifiers use modern Deno conventions such as JSR, `npm:`, or explicit import-map entries.
- Troubleshooting guidance starts with Deno-native checks such as `deno check`, `deno info`, debugger flags, or permission tracing.
- Migration advice avoids legacy whole-workspace activation and deprecated deploy defaults.
