# init: Initialize / Tidy an Existing Directory

Target directory = the argument, defaulting to cwd. Four stages: preflight (read-only) → parallel scan (read-only) → proposal + confirmation → execute + self-verify. **No write operations of any kind before the user confirms.**

## 1. Preflight (read-only)

- **Existing control files**: if `AGENTS.md`/`CLAUDE.md`/`INDEX.md`/`log.md` already exist, read them and offer merge/skip/overwrite choices in the proposal — never overwrite by default. Re-running init on an initialized directory = incremental tidy-up (equivalent to a deep lint), not a rebuild.
- **Git state**: is it already a repo; detect nested repos with `find . -name .git -not -path './.git'` (self-governing projects → ignore in git and mark `graduated` in INDEX; third-party clones → ignore).
- **Tool caches**: `.firecrawl/` `.gstack/` `.playwright-mcp/` `.wrangler/` `.logs/` and any other dot-prefixed tool-emitted directories, judged by the "Version Control Boundary" three questions.
- **Structure issues**: code files scattered at topic roots (belong in `app/` or `demo/`), empty shell directories, stray root files, symlinks (mark `external`).
- **Sensitive files**: filenames matching `.env` `.envrc` `*.pem` `*.key` `credential*`; contents matching common token prefixes (`sk-` `AKIA` `ghp_` `xoxb-` `cfut_` etc.). Hits must be gitignored, must never be committed, and must be flagged prominently in the proposal.

## 2. Parallel Scan

With many subdirectories (>6), dispatch 2-3 Explore agents over shards; each directory yields a one-line summary (≤ 45 chars, stating what idea/discussion/prototype it holds) plus a form judgment (notes-only / runnable prototype / generated output / mixed / empty). Few directories — scan them yourself. Summary quality determines later merge-routing accuracy; do not phone it in.

## 3. Proposal (present complete, then wait for confirmation)

List by block:

- **Control files to create**: `AGENTS.md` (from `<skill_dir>/templates/AGENTS.template.md`), `CLAUDE.md` (always `# Claude Code Instructions` + blank line + `@AGENTS.md`), the draft `INDEX.md` table (full coverage: directory | status | updated | summary), `log.md` (with its first entry).
- **.gitignore content**: generic patterns (`.DS_Store`, `node_modules/`, tool caches, `.env`/`.envrc`, `**/demo/scratch/`) plus instance entries for this directory (nested repos, third-party clones).
- **Structure moves**: each item as `from → to`, targeted by the code's role: `app/` (the topic's deliverable) / `demo/` (process demonstration) / `demo/scratch/` (disposable) / framework-native skill layout (leave in place).
- **⚠️ Destructive items listed separately**: empty-directory deletions, file moves — confirm item by item; partial acceptance is fine.
- **git init + first commit**: ask by default; only do it when the user explicitly wants it.

## 4. Execute + Self-Verify

Execute within the confirmed scope. Self-verify three ways: directory↔INDEX match in both directions; no sensitive file tracked by git; topics missing READMEs listed in the report. Finish with a report of created/modified/moved/deleted items plus pending decisions (missing READMEs, merge candidates, rename candidates, etc.).

## Principle

Once `AGENTS.md` lands, the rules live in the directory itself: any later session there (including agents without this skill installed) works from `AGENTS.md`. The skill is an entry point and accelerator, not a dependency.
