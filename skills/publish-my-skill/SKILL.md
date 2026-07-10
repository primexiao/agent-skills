---
name: publish-my-skill
description: Publish or update Prime's Agent Skills in the public primexiao/agent-skills GitHub repository and make them installable through skills.sh. Use when asked to publish, release, ship, or update a local skill; copy its complete payload into the repository; update the catalog; commit and push it; or verify publication with `npx skills add`. This skill is tied to primexiao/agent-skills and is not a generic publisher for other repositories.
license: MIT
metadata:
  author: primexiao
  version: "1.0.0"
---

# Publish My Skill

Publish one local Agent Skill at a time to `https://github.com/primexiao/agent-skills`, then verify that the GitHub-backed skills CLI can install it. A delayed or missing skills.sh page is not a failure when the `npx skills add` verification succeeds.

## Setup and self-update

- Require Node.js 18+, Git, GitHub CLI (`gh`), npm/npx, and network access.
- Locate this skill's own directory—the directory containing this `SKILL.md`—and use absolute paths when invoking bundled scripts.
- Run `node scripts/self-update.js auto` from this skill directory before publishing.
- If stderr contains `PUBLISH_MY_SKILL_UPDATED`, re-read this `SKILL.md` and restart the workflow using the updated files.
- Installed copies check the fixed GitHub source at most once every 24 hours. Set `PUBLISH_MY_SKILL_AUTO_UPDATE=0` to disable, or change the interval with `PUBLISH_MY_SKILL_AUTO_UPDATE_TTL_HOURS`.
- Source checkouts skip automatic replacement unless `PUBLISH_MY_SKILL_AUTO_UPDATE_SOURCE=1` is set.

Manual update commands:

```bash
node scripts/self-update.js status
node scripts/self-update.js check
node scripts/self-update.js apply
```

## Fixed publication target

- Repository: `primexiao/agent-skills`
- Remote: `git@github.com:primexiao/agent-skills.git` or its HTTPS equivalent
- Published path: `skills/<skill-name>/`
- Default branch: `main`
- Install command: `npx skills add primexiao/agent-skills --skill <skill-name>`

Do not redirect publication to another owner or repository without an explicit user request to change this skill itself.

## Publication workflow

### 1. Resolve the source skill

- Accept a path to the skill directory, not only its `SKILL.md` file.
- If the path is omitted, infer it only when exactly one recently discussed or edited skill is unambiguous; otherwise ask one concise question.
- Confirm that `SKILL.md` exists and that its frontmatter `name` matches the source directory name.
- Treat the full directory as the payload. Include referenced scripts, references, assets, templates, licenses, and configuration.
- Exclude regenerable runtime content: `.git`, `cache`, `node_modules`, `__pycache__`, `.DS_Store`, and `*.log`.

### 2. Resolve and synchronize the repository

Prefer an existing local clone whose `origin` normalizes to `primexiao/agent-skills`. Otherwise use `PUBLISH_MY_SKILL_REPO` when it points to a valid clone; if neither exists, clone the repository into a temporary directory.

Before modifying it:

```bash
gh auth status
git -C "$REPO" status --short --branch
git -C "$REPO" fetch origin main
git -C "$REPO" switch main
git -C "$REPO" pull --ff-only origin main
```

Stop rather than mixing unrelated changes, overwriting a divergent branch, or publishing from a repository with the wrong remote.

### 3. Prepare the payload

Run:

```bash
node "$SKILL_DIR/scripts/prepare-publish.js" "$SOURCE_SKILL" --repo "$REPO"
```

The script validates the required frontmatter, mirrors the filtered payload into `skills/<name>/`, removes stale files from earlier versions, and adds or refreshes the README catalog row. It deliberately does not commit or push so the diff remains reviewable.

### 4. Review before public release

Inspect only the intended paths:

```bash
git -C "$REPO" status --short
git -C "$REPO" diff --check
git -C "$REPO" diff -- README.md "skills/$SKILL_NAME"
```

Confirm all of the following:

- Every changed line belongs to the requested skill or its README catalog row.
- No secret, credential, private endpoint, personal contact information, local absolute path, or runtime cache is present.
- Every relative file referenced by `SKILL.md` exists in the prepared payload.
- The skill remains portable: do not add product-specific metadata such as `agents/openai.yaml` unless the source intentionally requires it.
- Run the source skill's documented tests or validation commands when they exist. Do not invent dependencies or execute unrelated project scripts.

If the prepared tree is identical to `main`, report that it is already current and continue to installation verification without creating an empty commit.

### 5. Commit and publish

An explicit request to **publish** authorizes committing and pushing the prepared skill to this fixed public repository. Do not ask again unless the worktree is mixed, the branch diverged, credentials are missing, or another material ambiguity remains.

Stage only the intended paths:

```bash
git -C "$REPO" add -- README.md "skills/$SKILL_NAME"
git -C "$REPO" commit -m "feat($SKILL_NAME): publish skill"
git -C "$REPO" push origin main
```

For an update, use `feat($SKILL_NAME): update skill`. If branch protection rejects direct push, create a focused pull request, merge it, and continue only after the commit is present on `origin/main`.

### 6. Verify publication through a real install

Do not wait for the new skill page or URL to appear on skills.sh. Verify against the GitHub source in an isolated temporary project:

```bash
VERIFY_ROOT="$(mktemp -d)"
mkdir -p "$VERIFY_ROOT/project" "$VERIFY_ROOT/home" "$VERIFY_ROOT/npm-cache"
cd "$VERIFY_ROOT/project"
HOME="$VERIFY_ROOT/home" npm_config_cache="$VERIFY_ROOT/npm-cache" \
  npx --yes skills add primexiao/agent-skills \
  --skill "$SKILL_NAME" --agent codex --copy --yes
test -f "$VERIFY_ROOT/project/.agents/skills/$SKILL_NAME/SKILL.md"
rm -rf "$VERIFY_ROOT"
```

The publication succeeds when all of these are true:

1. The target commit exists on `origin/main`.
2. The `npx skills add` command exits successfully.
3. The installed `SKILL.md` exists and declares the expected `name`.

The skills.sh page, badge, search result, or direct skill URL may update later and is not part of the success condition.

## Final report

Report only:

- published skill name;
- commit hash and branch;
- exact install command;
- isolated install verification result;
- any material caveat, especially if a PR was required or the skills.sh page is still stale.
