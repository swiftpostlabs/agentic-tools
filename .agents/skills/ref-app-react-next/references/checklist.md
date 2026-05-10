# Review Checklist

- The app baseline explicitly chooses Next.js, strict TypeScript, and Yarn for the Node-based workflow.
- The top-level source tree separates routes, feature code, shared UI, and maintenance surfaces intentionally.
- The app did not absorb framework or tooling complexity that a standalone browser app could have avoided.
- React component internals and dependency choices are delegated to `ref-react` instead of duplicated here.
- Next.js rendering, routing, and integration rules are delegated to `ref-next` instead of duplicated here.
- Package manager usage stays consistent rather than mixing multiple Node package managers in the same app.
