# Continuity

## [PLANS] Plans Log

- 2026-08-19T09:42Z [USER] Review Cloudflare Workers compatibility, clarify how to use available credits, and design durable per-user token/credit accounting.
- 2026-08-19T09:45Z [USER] Use Cloudflare as the MVP platform and prioritize eligible hackathon-credit services; this is an MVP architecture choice, not the final production platform decision.

- 2026-08-19T11:38+02:00 [USER] Extend the MVP with Supabase email login/registration and a per-user project list, using InkSightAI as the functional reference.

- 2026-08-18T00:00+02:00 [USER] Discuss the MVP improvements before implementation; scope is limited to refining existing functionality, including a full English UI, usability, visual appeal, accessibility, and responsive behavior. AI integration is explicitly out of scope.
- 2026-08-18T00:00+02:00 [ASSUMPTION] First agree on the product/UI direction, then implement only the agreed refinements and verify them with project checks.

## [DECISIONS] Decisions Log

- 2026-08-19T09:42Z [ASSUMPTION] Treat the current request as a read-only architecture review; no deployment or source changes authorized yet.
- 2026-08-19T09:45Z [USER] Cloudflare credits cover Workers, Durable Objects, Workers AI, KV, D1, Queues, Vectorize, R2 and delivery/security items, but do not cover AI Gateway Unified Billing.
- 2026-08-19T09:45Z [ASSUMPTION] For the MVP, use Workers AI for inference, Durable Objects for per-user usage state, and keep Supabase Auth/project metadata until a D1 migration is explicitly requested.
- 2026-08-19T09:48Z [USER] Asked whether Workers AI could consume the shared Cloudflare credit balance too early and reduce budget for other eligible MVP services.
- 2026-08-19T09:52Z [USER] Proposed storing editor files and attachments in Supabase Storage, following the existing InkSightAI project.

- 2026-08-19T11:38+02:00 [CODE] Use `@supabase/supabase-js` directly in the client for the MVP auth/session and project CRUD flow; keep the existing local editor-file persistence unchanged to avoid expanding scope into file synchronization.
- 2026-08-19T11:38+02:00 [CODE] Project ownership is enforced by `supabase/migrations/001_paper_editor.sql` with `owner_user_id = auth.uid()` RLS policies.

- 2026-08-18T00:00+02:00 [CODE] Existing product surface is an academic paper workspace with projects, project files, outline navigation, block editor, slash commands, LaTeX style setup, and LaTeX download.
- 2026-08-18T00:00+02:00 [USER] Do not add future-scope functionality, especially AI integration.

## [PROGRESS] Progress Log

- 2026-08-19T10:16Z [CODE] Added Supabase project-scoped private Storage provisioning, `project_files` metadata/RLS migration, remote file-tree persistence, autosave, upload/download/rename/move/delete flows, and server-only service-role handling.
- 2026-08-19T10:16Z [CODE] Added OpenNext Cloudflare configuration, Wrangler configuration, preview/deploy scripts, environment examples, and an AI kill switch; Workers AI/Durable Objects bindings are intentionally not enabled yet.
- 2026-08-19T12:25Z [CODE] Added the second tranche: native Workers AI provider, authenticated AI requests, per-user SQLite Durable Object quota/RPM enforcement, custom OpenNext worker export, AI/DO Wrangler bindings, and Cloudflare setup documentation. Plain Next.js development keeps the existing Groq fallback unless `AI_PROVIDER=cloudflare` is explicitly selected.
- 2026-08-19T12:40Z [USER] Requested an optional registration code that grants extra AI credits.
- 2026-08-19T12:55Z [USER] Created the Supabase project and configured Wrangler, but requested a step-by-step connection and deployment guide.
- 2026-08-19T13:30Z [USER] Requested a user/account page showing available AI credits.
- 2026-08-19T13:40Z [USER] Requested one coherent environment-variable workflow instead of mixing `.env`, `.dev.vars`, Wrangler vars, and secret commands.
- 2026-08-19T13:55Z [USER] Asked how collaborators discover required environment keys after removing `.env.example`.
- 2026-08-19T14:00Z [USER] Asked whether `.dev.vars` can automate Cloudflare secret uploads.
- 2026-08-19T13:50Z [USER] Requested a document-focused AI assistant resembling the supplied screenshots: compact composer after Space, file-focused response, and model-selected Markdown block edits.
- 2026-08-19T13:50Z [USER] Requested a registration-stage disclaimer covering AI, data handling, user responsibility, and operational risks.
- 2026-08-19T14:42+02:00 [USER] Requested per-user AI provider selection: local Groq by default, Cloudflare as the shared provider, and optional user-owned Groq/OpenAI keys.

- 2026-08-19T11:38+02:00 [CODE] Added Supabase client/configuration, `AuthProvider`, protected root route, `/login`, `/register`, Supabase-backed project listing/creation, and sign-out.
- 2026-08-19T11:38+02:00 [CODE] Added the Supabase schema migration and `SUPABASE_SETUP.md`; auth pages follow the existing calm research-workspace visual language and responsive system.

- 2026-08-18T00:00+02:00 [TOOL] Completed read-only project reconnaissance; no application source files have been changed.
- 2026-08-18T10:08+02:00 [CODE] Implemented the approved English UX copy pass, refined project setup wording, clarified export/status labels, translated slash commands and prompts, and updated accessible names.
- 2026-08-18T10:08+02:00 [CODE] Reworked the existing visual system in `src/styles.css`: restrained blue research-workspace palette, clearer hierarchy, consistent controls, focus/hover states, sticky document bar, improved editor spacing, and mobile file-tree navigation.
- 2026-08-18T10:23+02:00 [CODE] Refined the slash menu after visual comparison with the supplied Notion reference: fixed max height, internal scrolling, compact rows/previews, and a persistent keyboard-help footer.
- 2026-08-18T10:26+02:00 [CODE] Fixed slash-menu keyboard navigation after manual scrolling by keeping the editor interaction active and scrolling the newly selected menu item into the nearest visible position via `scrollIntoView`.
- 2026-08-18T10:31+02:00 [CODE] Fixed slash-menu confirmation on `Enter` by intercepting slash-menu keys during React capture phase and stopping propagation before ProseMirror can insert a new paragraph.
- 2026-08-18T10:50+02:00 [CODE] Hardened `latexToTiptap` against sparse LaTeX by recursively removing empty text nodes before returning the document JSON; this prevents ProseMirror's `Empty text nodes are not allowed` error during `.tex` import.
- 2026-08-18T11:06+02:00 [CODE] Added a reproducible complex fixture from the supplied `main.tex`, expanded `enumsentence`, `shortex`, `node`, `nodeconnect`, and `ex` macros, normalized emphasis/spacing commands, and padded parsed tables for valid editor structure.
- 2026-08-18T11:06+02:00 [CODE] Added a bounded Markdown round-trip utility for verification: `LaTeX → Tiptap → Markdown → Tiptap → LaTeX`.
- 2026-08-18T11:30+02:00 [USER] Product direction is to create new papers in the app and export them to LaTeX; faithful import of arbitrary existing LaTeX is not a product requirement.
- 2026-08-18T13:31+02:00 [USER] Proceed with the MVP plan focused on creating new papers, reliable export for supported styles, and limited parser regression coverage.

## [DISCOVERIES] Discoveries Log

- 2026-08-19T12:25+02:00 [DISCOVERY] The observability buffer is process/isolate-local and capped at 500 events; it supports MVP inspection only and must move to shared durable telemetry before production analytics or cross-instance reporting.

- 2026-08-19T09:42Z [CODE] `app/api/ai/chat/route.ts` authorizes neither Supabase sessions nor a server-verified user identity; usage is keyed by the client-controlled `ai_client_id` cookie.
- 2026-08-19T09:42Z [CODE] `src/ai/credits.ts` stores quotas in a module-level `Map`; this is process/isolate-local and cannot enforce a shared quota across Cloudflare Worker isolates or deployments.
- 2026-08-19T09:42Z [CODE] The current app is a Next.js 16.3.1 App Router app with a dynamic AI route, browser Supabase auth/project metadata, and localStorage-backed project files; no Wrangler/OpenNext configuration exists.
- 2026-08-19T09:45Z [USER] The provided credit grant expires 2027-08-12 or when exhausted, whichever comes first.
- 2026-08-19T09:48Z [TOOL] Cloudflare documents Workers AI as per-model, usage-based Neuron billing and states that dashboard budget alerts are informational and do not cap or pause usage.
- 2026-08-19T09:52Z [CODE] InkSightAI uses a private bucket per project, server-side service-role storage operations, and Storage RLS policies; the current editor has only client-side localStorage persistence and no file metadata table.
- 2026-08-19T12:25Z [TOOL] Cloudflare official documentation confirms direct Workers AI binding calls use `env.AI.run(model, input)` and OpenNext custom workers are required to export Durable Object classes alongside the generated handler.
- 2026-08-19T12:25Z [DISCOVERY] `initOpenNextCloudflareForDev()` attempts a remote Wrangler session; it is guarded by `CLOUDFLARE_API_TOKEN` so builds and tests do not require Cloudflare credentials.
- 2026-08-19T12:40Z [CODE] Added promo code validation through a Supabase `auth.users` trigger and one-time per-user credit grants; the Durable Object persists bonus credits separately from the daily quota.
- 2026-08-19T12:55Z [CODE] Added safe Wrangler defaults with AI disabled and expanded CLOUDFLARE_SETUP.md with Supabase migration, local env, secrets, first deployment, redirect URL, and AI activation steps.
- 2026-08-19T13:30Z [CODE] Added protected `/user` account page, authenticated `/api/user/credits` endpoint, Durable Object usage status RPC, local Groq fallback status, and Account navigation from the projects page.
- 2026-08-19T13:32Z [CODE] Aligned the local Groq credit store with one-time signup bonuses so the account page and local fallback report the same remaining-credit model as Cloudflare production.
- 2026-08-19T13:40Z [CODE] Centralized local configuration in ignored `.dev.vars`; added a loader used by Next/OpenNext scripts, removed `.env.example`, removed the old `.env` containing exposed credentials, expanded `.dev.vars.example`, and kept production secrets in Wrangler's secret store.
- 2026-08-19T13:55Z [CODE] Expanded `.dev.vars.example` into the complete collaborator template with required/optional sections and removed the stale `.env.example` exception from `.gitignore`; setup docs already point collaborators to this template.
- 2026-08-19T14:00Z [CODE] Added dry-run-by-default `secrets:sync` using Wrangler `secret bulk` over stdin; it allow-lists runtime secret keys, never prints values, and requires `--apply` for the remote write.
- 2026-08-19T14:57+02:00 [CODE] Replaced the shared `AI_OBSERVABILITY_KEY` gate with Supabase session verification plus an `AI_OBSERVABILITY_ADMIN_USER_IDS` allowlist; `/dev/ai` now sends the authenticated bearer token and `/api/ai/usage` denies unauthenticated/non-admin users.
- 2026-08-19T15:02+02:00 [CODE] Clarified local-vs-Cloudflare AI configuration in `CLOUDFLARE_SETUP.md` and added `AI_USER_KEYS_ENCRYPTION_KEY` to the allowlisted Cloudflare secret sync keys.
- 2026-08-19T15:08+02:00 [USER] Reported that local AI requests still returned the disabled-feature response.
- 2026-08-19T15:08+02:00 [CODE] Set the ignored local `.dev.vars` value `AI_ENABLED=true`; the loader now reports `AI_ENABLED=true`, provider `groq`, and configured encryption/Groq key values.
- 2026-08-19T15:12+02:00 [USER] Reported that AI output was displayed as raw JSON in the chat instead of changing the active file.
- 2026-08-19T15:12+02:00 [CODE] Made valid AI edit proposals auto-apply to active Markdown/LaTeX files, kept only a short status message in chat, added tolerant parsing for malformed provider JSON, and clarified unsupported binary-file behavior.
- 2026-08-19T15:18+02:00 [USER] Reported that the Apply control was not visible in the AI panel.
- 2026-08-19T15:18+02:00 [DISCOVERY] The supplied screenshot has `google.png` selected; the current desired flow auto-applies text-file edits and intentionally has no Apply button, while binary files cannot receive text edits.
- 2026-08-19T15:27+02:00 [USER] Defined three contextual AI outcomes for the Space composer: conversational response without persistent chat, insertion of new file content, and modification of existing file text.
- 2026-08-19T15:27+02:00 [CODE] Added explicit `conversation|insert|modify` intent routing, transient single-cycle messages, animated thinking state, disabled chat affordances, automatic insert/modify application, and keep/undo controls.
- 2026-08-19T15:31+02:00 [CODE] Closing the Space composer now clears its transient messages and state while preserving any already-saved document change.
- 2026-08-19T15:38+02:00 [USER] Supplied a broken current screenshot and two visual references for the desired compact composer and page-updated feedback bar.
- 2026-08-19T15:38+02:00 [CODE] Added provider JSON mode for Groq/OpenAI, tolerant response-field aliases, compact inline composer styling, conversation response affordance, and Page updated action bar with disabled chat, undo, and confirm controls.
- 2026-08-19T13:50Z [CODE] Added structured editor context and JSON edit proposals (`replace_current`, `insert_after_current`, `append`), Markdown block application with user confirmation/undo, and redesigned the AI composer/card UI around the active file.
- 2026-08-19T13:52Z [CODE] Added visible post-apply undo control and documented the new supervised editing scope in PRODUCT.md; provider output parsing tolerates JSON code fences or surrounding text.
- 2026-08-19T13:50Z [CODE] Added an accessible required registration service notice covering storage, AI-provider processing, inaccurate output, sensitive material, telemetry, intellectual property, backups, and a version/timestamp acknowledgement in Supabase user metadata.
- 2026-08-19T14:42+02:00 [CODE] Added encrypted per-user AI provider settings, Cloudflare/Groq/OpenAI selection in `/user`, OpenAI provider support, and provider-aware chat/credit routing. Cloudflare usage is shown separately from external-key requests.
- 2026-08-19T09:56Z [TOOL] Supabase Storage docs confirm the global file-size limit applies across all buckets: Free 50 MB, Pro/Team up to 500 GB, with lower per-bucket limits allowed. Separate buckets do not bypass the global limit.
- 2026-08-19T09:56Z [DECISION] Retain one private Supabase Storage bucket per project for isolation and per-project policy/lifecycle management, while enforcing global and per-file limits in application/database policy.

- 2026-08-18T00:00+02:00 [CODE] Italian copy is spread across project onboarding, sidebar actions, editor placeholders/prompts, slash-command metadata, export labels, and LaTeX fallback strings; localization needs to cover all of these for consistency.
- 2026-08-18T00:00+02:00 [CODE] The current mobile layout hides most navigation and keeps only a narrow file-tree slice, so responsive usability is a high-value refinement of existing behavior.
- 2026-08-18T16:24+02:00 [CODE] Architecture review confirms Tiptap JSON is the canonical in-memory model; Markdown conversion is a bounded local utility used for round-trip tests, while persistence stores project files in browser localStorage and the editor writes LaTeX to `.tex` files.
- 2026-08-18T16:24+02:00 [CODE] No Pandoc, Remark/Rehype, vector database, RAG pipeline, backend API, citation AST, or AI integration is present in the current source/dependencies.
- 2026-08-18T16:29+02:00 [CODE] Implemented Markdown-first editing for the current local workspace: `main.md` is the starter document, `.md`/`.markdown` files hydrate Tiptap through the Markdown parser, and edits persist serialized Markdown; `.tex` files retain the existing LaTeX compatibility path.
- 2026-08-18T16:29+02:00 [CODE] Markdown inline round-trip now preserves bold, italic, links, and `[@id]` references as structured Tiptap marks/nodes.
- 2026-08-18T17:31+02:00 [CODE] File-tree UX now hides filename extensions, creates extensionless documents as internal `.md` files, preserves existing file extensions during rename, and uses distinct document/folder affordances.
- 2026-08-18T17:31+02:00 [CODE] Workspace nodes support rename/delete actions and drag-and-drop moves into folders; the root `Paper` folder is protected and deleting the active subtree selects the first remaining file.
- 2026-08-18T18:27+02:00 [CODE] Simplified `BlockEditor` command and file-type branching with named helpers and exclusive `switch` handling; `FileTree` now reuses `displayProjectLabel` and avoids a non-null assertion.
- 2026-08-19T00:00+02:00 [USER] Requested an original inline hint on empty editor rows conveying shortcuts for ideas and slash commands without copying Notion's wording.
- 2026-08-19T00:00+02:00 [CODE] Updated the empty-paragraph CSS hint to `Start writing · Space for ideas · / for commands`; it applies to empty paragraphs rather than only the first editor paragraph.
- 2026-08-19T10:30+02:00 [USER] Clarified that the hint must appear beside the cursor in the currently empty editor row.
- 2026-08-19T10:30+02:00 [CODE] Added a small Tiptap decoration extension that marks only the currently selected empty paragraph, making the inline hint cursor-aware and robust to ProseMirror's trailing `<br>`.

## [OUTCOMES] Outcomes Log

- 2026-08-19T13:10+02:00 [TOOL] Completed a read-only UI/UX critique of the authenticated projects/editor surfaces. Main findings: Unicode glyphs are used as primary icons, create/rename/delete rely on native prompt/confirm dialogs, mobile hides outline/navigation, visible “New paper” and “Workspace” controls are inert, and save status does not distinguish local/remote persistence failures. Automatic detector was unavailable and localhost browser inspection was denied by browser permission; conclusions are code-evidenced.
- 2026-08-19T13:20+02:00 [USER] Supplied screenshots for registration, login, project list, and editor screens to replace the previously unavailable live visual inspection.
- 2026-08-19T13:20+02:00 [TOOL] Screenshot review confirms the calm academic visual direction is coherent; visible weaknesses are oversized empty canvas areas on auth/projects, weak file-action iconography, low-density sidebar labels, ambiguous file-type affordances, and an over-prominent optional bonus-code field.
- 2026-08-19T13:42+02:00 [CODE] Implemented the UI/UX pass: added shared inline SVG icons, replaced file/folder native prompts and delete confirmation with accessible in-app dialogs, surfaced upload errors, added `/user` account navigation to the editor sidebar, kept outline/navigation/account visible on mobile, and improved touch target sizing.
- 2026-08-19T13:42+02:00 [TOOL] UI pass verified with 10 test files and 41 passing tests, `npx tsc --noEmit`, and successful `npm run build`.
- 2026-08-19T13:42+02:00 [CODE] Renamed the editor save indicator from “Saved locally” to “Autosaved” to avoid contradicting the authenticated remote workspace model.

- 2026-08-19T12:25+02:00 [CODE] Added bounded dev-only AI observability with structured metadata events, `/api/ai/usage`, and `/dev/ai` dashboard for request volume, outcomes, latency, model usage, character volume, credits, and recent errors; prompts, completions, credentials, and auth tokens are excluded.
- 2026-08-19T13:05+02:00 [CODE] Added Pydantic Logfire Cloudflare instrumentation with server-side AI provider spans, Worker/Usage Durable Object wrappers, `.dev.vars.example`, and production secret setup documentation; prompt and completion content remain excluded.
- 2026-08-19T12:25+02:00 [TOOL] AI observability changes verified with `npm test` (10 files, 40 tests passing) and `npm run build` (successful). No lint script is defined.

- 2026-08-19T10:16Z [TOOL] Verification passed after implementation: `npm test` (10 files, 40 tests), `npm run build`, and `npx opennextjs-cloudflare build` all succeed. `wrangler deploy --dry-run` was not completed because Wrangler attempted to write logs under a host path outside the workspace and received EPERM.
- 2026-08-19T12:25Z [TOOL] Second-tranche verification passed: TypeScript check, `npm test` (10 files, 40 tests), `npm run build`, and `npx opennextjs-cloudflare build` succeed. `wrangler deploy --dry-run` remains blocked only by the sandbox denying Wrangler access to `/Users/romeo/Library/Preferences/.wrangler/metrics.json`.
- 2026-08-19T12:55Z [TOOL] TypeScript and production build pass after Wrangler default changes. Local `wrangler whoami` could not reach Cloudflare from the sandbox because of DNS/network and Wrangler log-path restrictions.
- 2026-08-19T13:30Z [TOOL] Account/credits UI verified with TypeScript, 40 passing tests, and successful Next production build; route inventory includes `/user` and `/api/user/credits`.
- 2026-08-19T13:32Z [TOOL] Credit bonus regression added; TypeScript, 41 tests, and Next production build pass.
- 2026-08-19T13:05Z [TOOL] Logfire integration verified with `npm test` (10 files, 40 tests), `npm run build`, and `npx opennextjs-cloudflare build`; no Logfire token is configured locally, so fresh remote data delivery remains unverified until a project token is added.
- 2026-08-19T13:40Z [TOOL] Environment workflow verified with `npm run build` and `npm run cf:build`; the existing ProjectSidebar test currently fails independently because it expects the old `chapters folder` label while the rendered fixture contains `resources folder`/`figures folder`/`references folder`.
- 2026-08-19T13:50Z [TOOL] AI editor changes verified with TypeScript, 43 passing tests across 11 files, `npm run build`, and `npm run cf:build`.
- 2026-08-19T13:52Z [TOOL] Final AI editor verification passes: TypeScript, 43 tests, Next build, and OpenNext Cloudflare build.
- 2026-08-19T13:50Z [TOOL] Registration disclaimer verified by successful `npm run build`; no legal review was performed and no Terms of Service or Privacy Policy pages were invented.
- 2026-08-19T13:55Z [TOOL] Environment template documentation verified by successful `npm run build`.
- 2026-08-19T14:00Z [TOOL] Secret sync script syntax and application build verified; no remote secret upload was executed.
- 2026-08-19T14:57+02:00 [TOOL] Observability access change verified with `npm test` (43 tests) and `npm run build` (successful).
- 2026-08-19T15:02+02:00 [TOOL] Secret sync script remains syntactically valid after adding the user-key encryption secret.
- 2026-08-19T15:12+02:00 [TOOL] AI edit behavior verified with `npm test` (43 tests) and `npm run build` (successful after removing unsupported regex flags).
- 2026-08-19T15:27+02:00 [TOOL] Three-way AI composer changes verified with `npm test` (43 tests) and `npm run build` (successful).
- 2026-08-19T15:31+02:00 [TOOL] Composer reset change verified with `npm test` (43 tests) and `npm run build` (successful).
- 2026-08-19T15:38+02:00 [TOOL] Reference UI/protocol changes verified with `npm test` (43 tests) and `npm run build` (successful); one accessibility test expectation was preserved by retaining the dialog name `AI assistant`.
- 2026-08-19T14:43+02:00 [TOOL] Provider-selection changes verified with TypeScript, 43 passing tests, Next production build, and OpenNext Cloudflare build.

- 2026-08-19T09:42Z [TOOL] Read-only verification passed: `npm test` reports 10 files and 40 tests; `npm run build` succeeds. No lint script is defined.

- 2026-08-19T11:38+02:00 [TOOL] MVP auth/project changes verified with `npm test` (9 files, 39 tests passing) and `npm run build` (successful); no lint script is defined.
- 2026-08-19T11:38+02:00 [TOOL] `npm install @supabase/supabase-js` completed; npm reported 5 audit vulnerabilities (3 moderate, 1 high, 1 critical), not remediated in this scoped change.

- 2026-08-18T10:08+02:00 [TOOL] `npm test` passes: 7 test files, 26 tests.
- 2026-08-18T10:08+02:00 [TOOL] `npm run build` passes with Next.js 16.3.1 and TypeScript checks complete.
- 2026-08-18T10:08+02:00 [CODE] PRODUCT.md and user-facing fallback labels are now English; AI integration and new product capabilities remain out of scope.
- 2026-08-18T10:23+02:00 [TOOL] Slash-menu refinement verified with `npm test` (26 tests passing) and `npm run build` (successful).
- 2026-08-18T10:26+02:00 [TOOL] Keyboard-navigation fix verified with `npm test` (26 tests passing) and `npm run build` (successful).
- 2026-08-18T10:31+02:00 [TOOL] Enter-confirmation fix verified with `npm test` (26 tests passing) and `npm run build` (successful).
- 2026-08-18T10:50+02:00 [TOOL] Import-parser fix verified with `npm test` (27 tests passing) and `npm run build` (successful).
- 2026-08-18T11:06+02:00 [TOOL] Supplied complex fixture verified in the real BlockEditor schema and round-tripped through Markdown; global checks pass with 8 test files and 29 tests, plus successful production build.
- 2026-08-18T11:30+02:00 [ASSUMPTION] Future parser work should prioritize the editor's generated document model and known export styles; external custom LaTeX is useful as a regression fixture but not the compatibility target.
- 2026-08-18T13:30+02:00 [CODE] Download now serializes the current editor JSON at click time, avoiding stale preview state and preventing empty exports after importing a `.tex` file.
- 2026-08-18T13:30+02:00 [CODE] Added style-level export acceptance checks for generic, ACM, and Nature documents: preamble, document delimiters, generated section, and non-empty output.
- 2026-08-18T13:31+02:00 [TOOL] Download regression verified with the supplied fixture; global checks pass with 8 test files and 33 tests, plus successful production build.
- 2026-08-18T16:24+02:00 [TOOL] Architecture assessment verified with `npm test` (8 files, 33 tests passing) and `npm run build` (successful); no source files changed.
- 2026-08-18T16:29+02:00 [TOOL] Markdown-first implementation verified with `npm test` (8 files, 34 tests passing) and `npm run build` (successful).
- 2026-08-18T17:31+02:00 [TOOL] File-tree changes verified with `npm test` (8 files, 35 tests passing) and `npm run build` (successful).
- 2026-08-18T18:27+02:00 [TOOL] Refactoring verified with `npm test` (8 files, 35 tests passing) and `npm run build` (successful); no `lint` script is defined in `package.json`.
- 2026-08-19T00:00+02:00 [ASSUMPTION] The hint says “ideas” instead of “AI” because the current product explicitly has no AI integration; this avoids exposing a non-functional affordance.
- 2026-08-19T10:30+02:00 [TOOL] Cursor-aware placeholder verified with `npm test` (8 files, 35 tests passing) and `npm run build` (successful).
- 2026-08-19T11:00+02:00 [TOOL] Table expansion and exit behavior verified with `npm test` (8 files, 36 tests passing) and `npm run build` (successful); regression covers `+ Row`, `+ Column`, `Escape`, `Enter`, and writing after the table.
- 2026-08-19T11:00+02:00 [USER] Requested expandable tables with plus controls and a reliable way to continue writing after a table.
- 2026-08-19T11:00+02:00 [CODE] Added `+ Row`/`+ Column` controls through a custom Tiptap table view, removed the fixed table layout, and added paragraph insertion plus keyboard exit behavior for `Escape` and `Enter` at the last cell.
- 2026-08-19T11:00+02:00 [CODE] Added a UI regression test covering row/column expansion and writing in the paragraph after a table.
- 2026-08-19T11:19+02:00 [USER] Requested an AI chat opened with Space, mediated by a server layer, with a replaceable provider abstraction and Groq as the initial provider.
- 2026-08-19T11:32+02:00 [CODE] Added `AIProvider`, `GroqProvider`, provider factory, `/api/ai/chat`, cursor-triggered `AIChat`, response insertion into Tiptap, `.env.example`, and product-scope documentation.
- 2026-08-19T11:32+02:00 [TOOL] Groq Chat Completions API shape verified against official Groq documentation; API key remains server-only and was not printed or sent to the client.
- 2026-08-19T11:32+02:00 [TOOL] AI integration verified with `npm test` (9 files, 39 tests passing) and `npm run build` (successful); no live provider request was made during verification.
- 2026-08-19T11:37+02:00 [USER] Requested protection against exhausting shared Groq capacity when multiple users use the application, including 3–4 keys and usage limits/credits.
- 2026-08-19T11:37+02:00 [CODE] Added comma-separated Groq key rotation, per-client in-memory credits, per-minute request limits, message-size/count limits, an 800-token output cap, 429 handling with retry metadata, and remaining-credit feedback in the chat.
- 2026-08-19T11:37+02:00 [ASSUMPTION] Default application limits are 20 credits/day and 5 requests/minute per anonymous client; they are configurable through `AI_CREDITS_PER_DAY` and `AI_REQUESTS_PER_MINUTE`.
- 2026-08-19T11:37+02:00 [DISCOVERY] Groq documents RPM/RPD/TPM/TPD as organization-level limits; multiple keys do not increase the organization ceiling, and spend limits apply across all keys. The current process-local credit store is not sufficient for multi-instance production and must later move to Redis/database with authenticated user identity.
- 2026-08-19T11:37+02:00 [TOOL] Limits and key-handling changes verified with `npm test` (10 files, 40 tests passing) and `npm run build` (successful).
