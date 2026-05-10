# Review Checklist

- Local development and remote workflows use the Supabase CLI deliberately rather than ad hoc container or SQL steps.
- Schema changes keep migrations, generated types, and consuming code in sync.
- Browser clients do not hold service-role or other privileged secrets.
- Edge Functions stay small, focused, and explicit about secrets and external integrations.
- ORM adoption preserves one clear schema authority instead of creating split-brain migrations.