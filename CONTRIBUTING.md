# Contributing

Contributions should make a skill more reliable, easier to trigger correctly,
or safer to run. New abstractions and generic prose without an observed failure
mode are usually not useful.

## Before opening a pull request

1. Read the target `SKILL.md` and only the references needed for the change.
2. Add a regression test or eval that fails for the observed problem.
3. Keep the published skill payload minimal and self-contained.
4. Run:

   ```bash
   npm test
   npx skills add . --list
   ```

5. Confirm the CLI discovers exactly the intended skill directories.

## Skill requirements

- `name` matches `skills/<name>` and uses lowercase hyphenated form.
- `description` states both what the skill does and when it should trigger.
- Referenced files exist and are linked from `SKILL.md` only when needed.
- Commands work from the skill directory and declare their runtime needs.
- Network sources, limitations, side effects, and output locations are explicit.
- No credentials, self-modifying code, automatic updates, install hooks, or
  proxy bypasses.
- Material adapted from another project keeps its required attribution and
  license.

## Tests and evals

- `tests/<skill>/`: deterministic helper and CLI behavior.
- `tests/repo/`: repository structure, security invariants, and policy.
- `evals/<skill>/`: end-to-end agent behavior and output quality.
- `evals/routing/`: positive, negative, near-miss, and collision trigger cases.

Use current supported runtimes. CI checks Node.js 22/24 and Python 3.10/3.14.

## Security reports

Do not open a public issue for a suspected vulnerability. Follow
[SECURITY.md](SECURITY.md).
