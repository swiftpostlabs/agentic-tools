# Review Checklist

- Route and layout files stay thin instead of accumulating most of the app's logic.
- `'use client'` appears only where browser interactivity or browser-only APIs genuinely require it.
- Reusable UI and feature logic live outside route entry files once the route shell grows.
- Next-specific integrations use their documented framework setup instead of ad hoc workarounds.
- Internationalization is introduced only when the app actually needs it, with `next-intl` as the default Next-specific choice.
- Yarn is the explicit package manager for Node-based Next.js work unless the repo already standardized differently.
