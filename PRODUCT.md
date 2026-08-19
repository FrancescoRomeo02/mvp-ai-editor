# Product

## Register

product

## Users

Researchers and students who write academic papers in a block editor and need to reach a maintainable LaTeX document for their chosen publication style quickly.

## Product Purpose

Paper editor helps users structure scientific content, navigate document files and sections, and generate maintainable LaTeX. Success means frictionless writing, an always-readable structure, and verifiable output.

## Document Architecture

Markdown is the canonical source format for editable papers. The visual Tiptap editor is a projection of that source into a structured JSON document tree, and each Markdown update is persisted with the project workspace. LaTeX remains a derived export format for supported publication styles. The current AI scope is a document assistant opened from an empty editor paragraph; it receives the active Markdown file and can propose a focused, user-applied block edit through a server-side provider adapter. It does not perform retrieval, citation validation, or unsupervised document automation.

AI usage is protected by server-side per-client credits and request limits. Groq credentials are configured as a rotatable pool, while Groq organization-level limits and spend limits remain the final ceiling. The current credit store is process-local; production deployments with multiple instances must replace it with shared storage and associate usage with authenticated users.

During MVP development, AI requests emit structured metadata logs and are also traced with Pydantic Logfire when `LOGFIRE_TOKEN` is configured. Open `/dev/ai` to inspect request volume, success/error/rejection rates, latency, model usage, character volume, credits, and recent failures. Both the dashboard data and `/api/ai/usage` require a verified Supabase session whose user ID is listed in `AI_OBSERVABILITY_ADMIN_USER_IDS`. AI edit responses are treated as file operations: valid proposals are applied automatically to the active Markdown or LaTeX file, while chat shows only a short status; prompts, completions, provider credentials, and auth tokens are not stored in the local telemetry or Logfire spans. The local dashboard is intentionally per server isolate; Logfire provides the durable cross-isolate view.

## Brand Personality

Scientific, calm, precise.

## Anti-references

Avoid dense SaaS dashboards, decoration without purpose, confusing hierarchies, and duplicated controls.

## Design Principles

- The paper structure should always be visible.
- Writing stays central; secondary tools stay quiet.
- Every action should have a predictable result.
- Content should remain readable during export.

## Accessibility & Inclusion

Target WCAG 2.1 AA: contrast, visible focus, semantic markup, keyboard navigation, and accessible control names.
