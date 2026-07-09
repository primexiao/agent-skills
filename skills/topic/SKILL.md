---
name: topic
description: Use when initializing or tidying an ideas/topics directory (/topic init), starting a new topic in a topic archive (/topic), checking a topic archive for convention drift (/topic lint), or when the user mentions /topic, topic archive, ideas directory, idea vault, or organizing scattered idea folders
license: MIT
metadata:
  author: primexiao
  version: "1.0.0"
---

# Topic — Flat Topic Archive Workflow

Turns a directory into a flat topic archive: one subdirectory per topic, isolated from each other by default, with a thin knowledge layer at the root — `INDEX.md` (full-coverage catalog) plus `log.md` (append-only timeline). The rules live in the target directory's own `AGENTS.md` after init, so day-to-day routing does not depend on this skill being installed.

Usage: `/topic [subcommand] [args]`

## Self-Update

Run `node scripts/self-update.js auto` from the skill directory before executing any subcommand. If stderr prints `TOPIC_SKILL_UPDATED`, re-read this `SKILL.md` before continuing. Requires Node.js 18+; if Node is unavailable, skip this step and continue.

- Source is pinned by `package.json.repository`: `primexiao/agent-skills`, path `skills/topic`.
- Installed copies check GitHub at most once every 24h and apply updates automatically. Set `TOPIC_SKILL_AUTO_UPDATE=0` to disable.
- Source checkouts skip auto-update unless `TOPIC_SKILL_AUTO_UPDATE_SOURCE=1` is set; local uncommitted changes under the skill directory also cause it to skip.
- Updates use a temp checkout, validate required files, back up the current copy, and roll back on failure. Status goes to stderr.

## Subcommand Routing

**Read only the reference file for the chosen subcommand. Do not preload the others.**

| Subcommand | Scenario | Read |
|---|---|---|
| `init [dir]` | Initialize/tidy an existing directory (defaults to cwd) | `<skill_dir>/references/init.md` |
| `lint` | Check and fix convention drift in an initialized archive | `<skill_dir>/references/lint.md` |
| (bare / anything else) | Start a new topic; `/topic <one-liner>` seeds it | `<skill_dir>/references/new-topic.md` |

Any input that is not a recognized subcommand is treated as "start a new topic" with the input text as the topic seed.

## Shared Rules

- `INDEX.md` is the invariant: every top-level directory has exactly one row; status ∈ `idea` / `active` / `graduated` / `external`.
- Topics are isolated by default: cross-topic awareness comes only from INDEX one-line summaries; never enter other topic directories unless the user explicitly asks.
- Session close means three touches: the topic `README.md` (synthesized outcomes, not transcripts), the topic's INDEX row, and one `log.md` line.
- `init` must present a complete proposal and get user confirmation before changing any files; bare invocation never restructures the root.
- Templates load from `<skill_dir>/templates/`; dates are absolute `YYYY-MM-DD`.
