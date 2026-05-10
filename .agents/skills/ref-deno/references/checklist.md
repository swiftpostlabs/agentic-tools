# Review Checklist

- `deno.json` owns tasks, config, and dependency conventions.
- Hybrid repos keep Deno-owned files and Node-owned files clearly separated.
- Permissions are explicit and scoped to the actual runtime needs.
- Dependency specifiers use modern Deno conventions such as JSR, `npm:`, or explicit import-map entries.
- Migration advice avoids legacy whole-workspace activation and deprecated deploy defaults.