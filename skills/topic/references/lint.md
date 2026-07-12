# lint: Check and Fix Convention Drift

Run in an initialized directory (has `INDEX.md`); otherwise suggest `/topic init` first.

If the user asks to check, audit, inspect, or report only, perform all checks read-only and return a proposed fix list. Apply safe fixes only when the user asks to fix or approves them.

## Five Checks

1. **Unregistered**: a top-level directory missing from `INDEX.md` — and the reverse, an INDEX row with no matching directory.
   For each `d in */`, set `name=${d%/}` first. If `[ -L "$name" ]`, verify that its INDEX status is `external` and do not traverse it. Otherwise check `grep -q "^| $name " INDEX.md`.
2. **Date drift**: topic content mtime newer than its INDEX row date → rescan that topic, refresh its summary and date.
   Only for a non-symlink `name`, get the latest mtime with `find "$name" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -exec stat -f '%Sm' -t '%Y-%m-%d' {} + | sort -r | head -1` (use `stat -c '%y'` on Linux).
3. **Missing README**: a topic with status `idea`/`active` and no `README.md` → create one from `<skill_dir>/templates/topic-README.template.md`, synthesizing from existing notes when possible.
4. **Stray root files**: files at the root other than control files (`AGENTS.md`/`CLAUDE.md`/`INDEX.md`/`log.md`/`.gitignore`) → file them into their topic or list as pending decisions.
5. **New tool-cache directories**: judge by the AGENTS.md "Version Control Boundary" three questions (regenerable? referenced? tool-written?); caches get a `.gitignore` pattern, and `git rm -r --cached` if already tracked.

## Fix Discipline

- When fixes are authorized, safe in-place changes include adding INDEX rows, refreshing dates, README skeletons, and ignore patterns; apply only those and report them.
- Deletions, moves, and merges — list them and get confirmation first.
- After authorized fixes were actually applied, append one `log.md` line recording the lint (found N, fixed M). In report-only mode, show the proposed line but do not write it.
