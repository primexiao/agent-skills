# lint: Check and Fix Convention Drift

Run in an initialized directory (has `INDEX.md`); otherwise suggest `/topic init` first.

## Five Checks

1. **Unregistered**: a top-level directory missing from `INDEX.md` — and the reverse, an INDEX row with no matching directory.
   `for d in */; do grep -q "^| ${d%/} " INDEX.md || echo "UNREGISTERED: ${d%/}"; done`
2. **Date drift**: topic content mtime newer than its INDEX row date → rescan that topic, refresh its summary and date.
   Latest mtime per directory: `find "$d" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -exec stat -f '%Sm' -t '%Y-%m-%d' {} + | sort -r | head -1` (use `stat -c '%y'` on Linux)
3. **Missing README**: a topic with status `idea`/`active` and no `README.md` → create one from `<skill_dir>/templates/topic-README.template.md`, synthesizing from existing notes when possible.
4. **Stray root files**: files at the root other than control files (`AGENTS.md`/`CLAUDE.md`/`INDEX.md`/`log.md`/`.gitignore`) → file them into their topic or list as pending decisions.
5. **New tool-cache directories**: judge by the AGENTS.md "Version Control Boundary" three questions (regenerable? referenced? tool-written?); caches get a `.gitignore` pattern, and `git rm -r --cached` if already tracked.

## Fix Discipline

- Fixes that are safe in place (adding INDEX rows, refreshing dates, README skeletons, ignore patterns) — apply directly and report.
- Deletions, moves, and merges — list them and get confirmation first.
- Close out by appending one `log.md` line recording the lint (found N, fixed M).
