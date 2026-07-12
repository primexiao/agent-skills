# Agent Instructions

This directory is a flat topic archive for exploratory ideas, discussions, and prototypes. Each topic lives in its own top-level directory and is independent by default.

## Repository Shape

- Every topic lives in a top-level directory: `<kebab-case-topic>/`. There is no `topics/` layer.
- Keep the root limited to control files: `AGENTS.md`, `CLAUDE.md`, `INDEX.md`, `log.md`, and `.gitignore`. Do not add scratch files at the root.
- `INDEX.md` is the invariant: every top-level directory must have exactly one row there. A directory missing from `INDEX.md` is a lint error.

## INDEX.md

- Use exactly `| Topic | Status | Updated | Summary |`, with one row per directory, an absolute `YYYY-MM-DD` date, and a one-line summary.
- Statuses:
  - `idea` — early scratch, notes only.
  - `active` — ongoing discussion or prototype.
  - `graduated` — grew into a self-governing project with its own instructions or git repo. Exempt from the topic rules below; only its index row is maintained.
  - `external` — symlink or externally-owned content. Exempt from topic rules.

## Session Routing (sessions started at this root)

- When a substantive topic emerges in conversation, read `INDEX.md` first.
- Clearly part of an existing topic → work inside that topic directory.
- Clearly new → create `<kebab-case-topic>/` with a `README.md` and add its `INDEX.md` row.
- Ambiguous between new and existing → propose a directory name and ask one short question before writing files.
- All files produced by a session go inside the topic directory, never the root.
- Prefer stable, descriptive slugs; append a qualifier only when a collision is real.

## Topic Directories

- Each topic must have a `README.md` holding synthesized outcomes, not transcript dumps: current decision, evidence, assumptions, unresolved questions, and next actions when they exist.
- Use optional subdirectories only when useful: `artifacts/`, `sources/`, `docs/`.
- Code placement depends on the code's role in the topic. Fixed vocabulary — never invent new directory names:
  - `demo/` — code written to demonstrate or validate something during discussion. Single demo directly inside, multiple as `demo/<slug>/`, framework-native layout within.
  - `app/` — the runnable thing IS the topic's deliverable (a tool or product being built).
  - Skills keep their framework-native layout (e.g. `.agents/skills/<name>/` plus `.claude/skills` symlinks); do not wrap them in `demo/` or `app/`.
  - Never scatter code files at the topic root.
- Process-only code — written to illustrate a point during discussion, not part of the topic's outcome — goes in `demo/scratch/`, which is gitignored. Keep-or-scratch test: referenced from the topic `README.md` as outcome or reproduction path → keep; only served the conversation → scratch.
- A topic may adopt a richer internal structure (e.g. a Karpathy-style LLM wiki with raw sources and generated pages). That is the topic's own business; root rules do not reach inside.

## Session Close (any session, root or inside a topic)

- Update the topic `README.md` with synthesized outcomes.
- Update the topic's row in `INDEX.md` (date, and summary if it drifted).
- Append one line to `log.md`: `## [YYYY-MM-DD] <topic-slug> | <one-line outcome>`.

## Isolation

- Topics are independent by default. Do not read other topic directories unless the user explicitly asks.
- Cross-topic awareness comes only from `INDEX.md` one-line summaries.
- Cross-topic digests (e.g. "what have I been thinking about lately") are generated on demand from `INDEX.md` and `log.md`, drilling into topic READMEs as needed. A digest worth keeping should be filed back into a relevant topic instead of vanishing into chat history.

## Version Control Boundary

Before committing execution byproducts, run this test:

- **Regenerable?** Files a tool can re-produce by re-running (fetch caches, browser audit logs, local dev state, build output) do not belong in git.
- **Referenced?** A file linked from a topic `README.md` or note is evidence and does belong in git.
- **Who wrote it?** Tool-emitted directories (typically dot-prefixed: `.firecrawl/`, `.gstack/`, `.playwright-mcp/`, `.wrangler/`, `.logs/`) are caches by default; deliberate session outputs are content.

Default: tool-emitted + unreferenced + regenerable → extend `.gitignore` with the pattern instead of committing. A snapshot or log worth keeping must be moved into the topic's `sources/` or `artifacts/`, referenced from its `README.md`, and then committed. When a new tool cache directory appears, add its pattern to `.gitignore` — the principle governs; the ignore list is just its instances.

## Lint (on demand)

When asked to lint this archive, check and fix:

- top-level directories missing from `INDEX.md`;
- topics whose content is newer than their `INDEX.md` date;
- topics missing `README.md`;
- stray files at the root.

## Notes And Evidence

- Write notes in the user's working language.
- Use absolute dates in `YYYY-MM-DD`; note the timezone when it matters.
- For factual claims that affect a decision, prefer primary sources (official docs, source code, package contents, command output) and link them from the topic document. Call out uncertainty explicitly instead of presenting a guess as fact.

## Safety

- Do not commit or document secrets, API keys, tokens, private endpoints, or credentials.
- Do not trigger real external delivery (email, SMS, IM, webhook, push) unless the user explicitly confirms the recipient and the action.
