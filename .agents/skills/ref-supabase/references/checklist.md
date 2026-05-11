# Review Checklist

- Local development and remote workflows use the Supabase CLI deliberately rather than ad hoc container or SQL steps.
- Schema changes keep migrations, generated types, local replay, and remote promotion or repair in sync.
- Browser clients do not hold service-role or other privileged secrets, and Data API exposure is explicit.
- CRUD calls make key choice, `select()` and filter ordering, returned-row expectations, and pagination explicit.
- Edge Functions stay small, focused, and explicit about secrets and external integrations.
- ORM adoption preserves one clear schema authority and the Drizzle or pooler connection mode is explicit when relevant.
