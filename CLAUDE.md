# AOMI Kit QR Manager — Project Instructions

## Source of truth

- This root `CLAUDE.md` is the canonical agent context for this repository.
- Root `AGENTS.md` directs Codex and other agents to read this file.
- Read `docs/CODEBASE_MAP.md` for the detailed architecture map.
- If `graphify-out/graph.json` exists, query Graphify before broad repository scans.
- Graphify and documentation are navigation aids; current source code is authoritative.
- Verify paths, models, and behavior against source before editing.

## Project purpose

AOMI Kit QR Manager manages skincare products, diagnoses, routine templates,
QR-token batches, seller assignment, activation, and mobile retrieval.

Primary roles:

- `ADMIN`: manages catalog, routines, tokens, imports, generation, and status.
- `SELLER`: assigns an available QR token to a routine/package.
- Mobile consumers retrieve or activate kits through token-based API routes.

## Technology stack

- Next.js 16 App Router with React 19 and TypeScript.
- Server Components by default; Client Components only when interactivity requires them.
- Auth.js/NextAuth v5 credentials authentication with JWT sessions and an
  explicit 12-hour maximum session age.
- Prisma 7 using `@prisma/adapter-pg`.
- PostgreSQL hosted by Supabase.
- Supabase Storage for product images.
- shadcn/ui using the Radix Luma preset `b3ST8r2wy`.
- Tailwind CSS and semantic design tokens.
- Zod for validation.
- Lucide icons.
- npm for package management.

Verify exact dependency versions in `package.json` before version-sensitive work.

## Essential commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test:qr-import
npm run test:pagination
npm run test:combobox
npm run test:qr-payload
npm run test:keepalive
npm run test:excel-import
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
npx prisma migrate status
```

Do not run destructive database commands without explicit approval.

## Repository map

- `src/app/`: App Router pages, layouts, API routes, and Server Actions.
- `src/app/(admin)/`: ADMIN-only application shell and pages.
- `src/app/(seller)/`: SELLER application shell and assignment flow.
- `src/components/`: shared navigation, authentication, and UI components.
- `src/components/ui/`: shadcn primitives and shared visual components.
- `src/lib/`: auth, Prisma, Supabase, audit, token, and server-domain helpers.
- `src/generated/prisma/`: generated Prisma client; do not hand-edit.
- `prisma/schema.prisma`: authoritative database schema.
- `prisma/migrations/`: committed migration history.
- `prisma/seed.ts`: repeatable seed data.
- `scripts/`: integration/regression scripts.
- `docs/`: setup, API, lifecycle, deployment, and architecture documentation.
- `public/`: static assets.
- `graphify-out/`: generated local knowledge graph when present.

## Important routes

Admin:

- `/admin`
- `/admin/products`
- `/admin/products/[id]`
- `/admin/diagnoses`
- `/admin/routine-types`
- `/admin/routines`
- `/admin/qr-tokens`

Seller:

- `/seller`
- `/seller/assign`

Authentication:

- `/login`
- `/api/auth/[...nextauth]`

QR/mobile API:

- `GET /api/qr/[token]`
- `POST /api/qr/activate`

Inspect the route tree before adding or renaming routes.

## Authentication and authorization

- Authentication is not authorization.
- Enforce role access on the server for every protected mutation and route.
- Reuse existing `requireAuth()`, `requireRole()`, and `requireAnyRole()` helpers.
- All helpers use `getCurrentUser()` (`src/lib/server/current-user.ts`) which re-queries the DB per request — deactivated users are rejected immediately.
- ADMIN mutations must remain ADMIN-only (`requireRole("ADMIN")`).
- SELLER assignment uses `requireAnyRole("SELLER", "ADMIN")` — both roles may use the flow.
- Never rely only on hidden buttons or client-side route guards.
- Do not weaken session, middleware/proxy, or credential validation.
- Preserve the 12-hour JWT maximum age and the per-request `getCurrentUser()`
  database revalidation that immediately rejects deleted or inactive users.
- Do not log passwords, hashes, secrets, tokens, or connection strings.

## Prisma conventions

- Use the generated client from `src/generated/prisma`.
- Follow existing import aliases; do not switch casually to `@prisma/client`.
- Use the shared Prisma instance from `src/lib/prisma.ts`.
- Keep relational writes atomic with transactions where required.
- Preserve unique constraints as the final integrity guard.
- Use `select` when a page needs only a subset of fields.
- Bound large `findMany` queries with pagination.
- Never edit generated Prisma files manually.
- Schema changes require a reviewed Prisma migration.
- Never rewrite or delete existing migration history casually.

## QR-token invariants

- Token values are globally unique.
- Generated values use `PREFIX-XXXXXX`: a six-character nanoid suffix from the
  unambiguous 32-character alphabet. Keep cryptographically secure randomness.
- A token's original batch ownership is immutable.
- Generation-format changes must remain backward compatible with existing and
  CSV-imported token values; never rewrite persisted tokens for formatting.
- Existing tokens must never be reassigned by import.
- Token status changes must follow the implemented lifecycle.
- Do not arbitrarily edit lifecycle timestamps.
- Do not expose unrestricted status editing.
- Destructive transitions require confirmation and server authorization.
- Preserve audit and activation history.
- Every surviving batch quantity must equal its actual token count.

Current status values must be verified in `schema.prisma` before adding logic.

## QR-token CSV import

- Core import logic lives in the reusable server-only import service.
- The Server Action handles authorization, FormData, UI result, and revalidation.
- Normalize and validate before insertion.
- Count invalid rows separately.
- Skip duplicates within the submitted file.
- Skip tokens already in the database.
- Use the database unique constraint for concurrent-import protection.
- Duplicate-only imports must not create empty batches.
- Mixed imports create a batch containing only newly inserted tokens.
- Never upsert an existing token with update data.
- Preserve this accounting invariant:

```text
totalRows = inserted + skippedDuplicate + invalid
```

Run `npm run test:qr-import` after changing import, token, batch, or lifecycle code.

## Pagination and filters

- QR-token pagination is server-side.
- Allowed page sizes are 50, 100, 500, and 1000.
- Use one canonical Prisma `where` object for table rows and matching count.
- Preserve search, status, batch, and page-size URL parameters.
- Filter changes reset the page to 1.
- The primary count card is filter-aware.
- Secondary status cards are global and labeled accordingly.
- Do not load the complete QR-token table into the browser.

## Catalog pagination

- Products, diagnoses, routine types, and routines use server-side pagination.
- Allowed page sizes are 25, 50, and 100; default 25.
- Use `resolvePagination()` (`src/lib/pagination.ts`) to clamp page/pageSize and
  derive `skip`/`take`; never fetch all rows and slice in memory.
- Use the shared `DataPagination` component; it preserves search/filter params
  and resets to page 1 on a page-size change.
- Every catalog `orderBy` includes an `id` tiebreaker for deterministic ordering.
- Run `npm run test:pagination` after changing pagination logic or page wiring.

## Excel imports

- Each admin catalog page has its own template and its own import; never a
  combined workbook. See `docs/EXCEL_IMPORTS.md`.
- Reading/generating XLSX uses `exceljs`. Do not reintroduce SheetJS (`xlsx`).
- The flow is two-phase: dry-run preview (zero writes) then confirmed commit.
- Commit re-parses and re-validates the file, writes only valid+new rows in one
  transaction, and emits exactly one audit entry. Failures roll back fully.
- Status labels are `CREATE` / `SKIP_EXISTING` / `ERROR`;
  `totalRows = CREATE + SKIP_EXISTING + ERROR`.
- Enforce the 10 MB / 5000-row limits, reject formulas, and escape generated
  cells against formula injection (`src/lib/spreadsheet-safe.ts`).
- Existing identifiers (SKU / slug / routine name) are skipped, never overwritten.
- Run `npm run test:excel-import` after changing any importer or template.

## Seller assignment UX

- Diagnosis and routine selection use the searchable `Combobox` (Popover +
  filtered list; no extra dependency). Client filtering is UX only — the server
  still authorizes the final selection.
- Changing the diagnosis clears routine, preview, product selections, and
  validation state.
- Token entry accepts manual typing, USB keyboard-wedge scanners (focused
  input + Enter), and camera scanning (native `BarcodeDetector`). All three feed
  `parseQrPayload` then the existing `validateToken` path.
- The camera scanner must stop every media track on success, close, and unmount,
  and must keep manual entry available as a fallback.
- Run `npm run test:combobox` and `npm run test:qr-payload` after changes here.

## Keep-alive endpoint

- `POST /api/internal/keepalive` runs a read-only `SELECT 1`; never writes.
- Auth via `x-keepalive-key` against `SUPABASE_KEEPALIVE_KEY` (timing-safe,
  length-checked). Must differ from `MOBILE_API_KEY`. Never log the key.
- 200 ok / 401 bad key / 503 unconfigured-or-DB-failure (generic, no internals).
- GitHub Actions calls the endpoint; database credentials never go to GitHub.
- Best effort only — not a substitute for Supabase Pro.
- Run `npm run test:keepalive` after changing the endpoint or workflow.

## Replacement rules

- `ProductReplacement.stepType` must equal both `source.stepType` and `replacement.stepType`.
- `addReplacementRule` derives `stepType` from the source product — never from form data.
- Reject any replacement candidate whose `stepType` differs from the source product's.
- Changing a product's `stepType` is blocked when it has outgoing or incoming replacement rules.
- The admin must remove all rules before the step type can be changed.
- Run `npm run audit:replacement-rules` to detect pre-existing stepType violations in the DB.
- Run `npm run test:replacement-rules` after changes to replacement-rule logic.

## Product catalog and storage

- Products have SKU, step type, category, description, status, images, and replacements.
- Advanced image and replacement management lives on the product detail page.
- Primary image = the `ProductImage` row with the lowest `sortOrder`. The `reorderProductImages`
  action normalizes all sort orders to `0, 1, 2…` on every reorder.
- The products list page fetches `images: { take: 1, orderBy: { sortOrder: 'asc' } }` to avoid N+1.
- Storage bucket: `product-images`.
- Public read does not mean public write.
- Upload/delete operations must remain server-authorized.
- Enforce allowed MIME types and size limits.
- `NEXT_PUBLIC_SUPABASE_URL` is validated with `new URL(...)` at client creation — only http/https accepted.
- Never expose the Supabase secret/service key to client code.
- `NEXT_PUBLIC_*` values may be browser-visible; secret values may not.

## Routines

- Routine templates include metadata, routine type, diagnoses, and ordered steps.
- Each step includes order, step type, default product, and instructions.
- Preserve nested validation and transactional update behavior.
- Do not simplify the routine editor by dropping nested fields.
- Maintain deterministic step order.

## UI conventions

- Preserve the shadcn `b3ST8r2wy` design system.
- Use semantic tokens instead of arbitrary color values.
- Use Server Components unless client state is genuinely required.
- Keep Sheets structured as fixed header, scrollable body, fixed footer.
- Keep tables inside bordered responsive surfaces.
- Use horizontal overflow wrappers on narrow screens.
- Icon-only controls require Tooltip and `aria-label`.
- Destructive controls use destructive semantics and confirmation.
- Preserve visible focus states and keyboard navigation.
- Do not reapply the shadcn preset without explicit approval.

## Coding conventions

- Prefer small focused changes over broad rewrites.
- Reuse existing helpers and components before creating abstractions.
- Avoid `any`; use generated Prisma and domain types.
- Validate external input with Zod or established validators.
- Keep server-only secrets and helpers out of Client Components.
- Privileged entry points that read server secrets or enforce server-side
  validation must import `"server-only"`. Current boundaries include
  `mobile-api.ts`, `server/env.ts`, `supabase-server.ts`,
  `server/image-signatures.ts`, and `keepalive.ts`.
- When standalone tests need pure logic from a server-only module, extract a
  dependency-free helper and keep the privileged wrapper server-only.
- Do not duplicate domain logic in pages, actions, and tests.
- Use clear names instead of explanatory comments for obvious code.
- Add comments only for non-obvious invariants or tradeoffs.
- Do not add production dependencies without justification.

## Documentation and Graphify

- Architecture map: `docs/CODEBASE_MAP.md`.
- Existing operational docs under `docs/` remain the detailed source.
- Prefer Graphify queries over scanning dozens of files.
- Open the exact source files returned by Graphify before changing code.
- Refresh Graphify after major route, schema, or domain restructuring.
- Update `docs/CODEBASE_MAP.md` when architecture changes.
- Do not update architecture docs for cosmetic-only changes.

## Security rules

- Never commit `.env` or `.env.local`.
- Never print complete database URLs or secret values.
- Never place a service-role key in `NEXT_PUBLIC_*`.
- Never trust role, status, IDs, file types, or token values from the client.
- Preserve server authorization and validation.
- Do not disable RLS or storage policies as a shortcut.
- Avoid broad deletion queries in tests.
- Test cleanup must target exact run-specific records.
- Do not run production cleanup from ad hoc scripts.

## Prisma generation

- The generated client lives in `src/generated/prisma/`.
- Run `npm run db:generate` explicitly after dependency or schema changes.
- This repository intentionally does not use a Prisma `postinstall` hook.
- Deployment automation is responsible for generation before `npm run build`
  when generated output is not already available.

## Git and change workflow

Before editing:

```bash
git status
git branch --show-current
```

- Do not overwrite unrelated uncommitted changes.
- Use feature branches for substantial work.
- Do not commit or push unless explicitly requested.
- Do not use `git add .` without reviewing changed and untracked files.
- Never force-push `main`.
- Keep generated artifacts and secrets out of commits.

## Verification expectations

For significant changes run:

```bash
npm run lint
npm run build
```

Additionally:

- QR import/lifecycle changes: `npm run test:qr-import`.
- Schema/migration changes: `npx prisma migrate status`.
- Formatting/whitespace: `git diff --check`.
- UI changes: manually inspect relevant desktop and mobile routes.
- Never claim browser testing if browser tooling was unavailable.

## Definition of done

A task is complete only when:

- requested behavior is implemented;
- authorization and invariants remain intact;
- relevant tests pass;
- lint passes;
- production build passes;
- no secrets or temporary files were introduced;
- documentation is updated when architecture changed;
- remaining limitations are reported honestly;
- changes are left uncommitted unless the user requested a commit.
