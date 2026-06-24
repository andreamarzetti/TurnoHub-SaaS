---
name: Custom fetch export fix
description: Vite strict package exports require customFetch to be re-exported from the lib index, not imported via deep subpath.
---

## Rule
Import `customFetch` as `import { customFetch } from "@workspace/api-client-react"` — NEVER from `@workspace/api-client-react/src/custom-fetch`.

**Why:** Vite respects the `exports` field in `package.json`. The `@workspace/api-client-react` package only exports `"."` pointing to `src/index.ts`. Deep subpath imports like `./src/custom-fetch` fail with "Missing specifier" at runtime even if TypeScript compiles them.

**How to apply:** Whenever adding a new file that needs `customFetch` or any other api-client-react export, always use the main package import. If a new export is needed, add it to `lib/api-client-react/src/index.ts`.
