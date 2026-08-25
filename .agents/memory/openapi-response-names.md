---
name: OpenAPI response names
description: Prevent naming collisions between Orval-generated Zod response validators and component TypeScript types.
---

When defining an OpenAPI response component used by an operation, avoid a component name that exactly matches the generated operation response validator (for example, `ArcoLookupResponse` for the `arcoLookup` operation). Prefer a domain-oriented result name such as `ArcoLookupResult`.

**Why:** The API Zod package re-exports both generated Zod validators and generated component TypeScript types. Matching names collide in the shared barrel and make the workspace typecheck fail.

**How to apply:** Before codegen, derive the operation validator name (`<OperationIdPascal>Response`) and give the response component a distinct entity or result name. Run the normal API codegen command afterward to confirm the generated barrels compile.