# Agent Skills

Four focused, portable skills for AI coding agents. Each skill follows the
[Agent Skills specification](https://agentskills.io/specification), keeps its
runtime payload self-contained, and can be installed independently.

## Skills

| Skill | Use it for | Runtime |
| --- | --- | --- |
| [`model-radar`](skills/model-radar/SKILL.md) | Filter, compare, and recommend OpenRouter models using price, context, capabilities, rankings, benchmarks, and task-level spend. | Node.js 22+; network on cache refresh |
| [`research-company`](skills/research-company/SKILL.md) | Evidence-backed company, product, competitor, and commercial due diligence with adaptive perspectives and contradiction tracking. | Web research capability |
| [`invest`](skills/invest/SKILL.md) | Chinese/English securities research, portfolio review, earnings analysis, narrative-conflict audits, investment theses, and gold/BTC allocation. | Python 3.10+, `curl`, web research capability |
| [`topic`](skills/topic/SKILL.md) | Capture or multi-perspective explore discussions, and safely initialize or lint a flat topic archive. | File editing tools; optional web research for explore |

`research-company` evaluates the business; `invest` evaluates a security,
portfolio, valuation, or investment decision. This boundary keeps their
triggers predictable.

## Install

Inspect the available skills:

```bash
npx skills add primexiao/agent-skills --list
```

Install one skill:

```bash
npx skills add primexiao/agent-skills --skill model-radar
```

Install all four:

```bash
npx skills add primexiao/agent-skills
```

The installer detects supported agents and lets you choose the target. Review
the selected `SKILL.md` and bundled code before installation.

## Design and security

- Progressive disclosure: routing and mandatory rules stay in `SKILL.md`;
  detailed procedures live in `references/`.
- No runtime self-update, bundled credentials, install hooks, or proxy bypass.
  Updates remain an explicit user action through the installer.
- Web pages and API responses are untrusted data, never instructions. Research
  skills separate sourced facts, claims, estimates, inferences, and unknowns.
- Executable helpers are dependency-light, tested, and scoped to the skill that
  ships them.

See [SECURITY.md](SECURITY.md) for the threat model and reporting process.
skills.sh audits are useful signals, not a substitute for reviewing a skill's
instructions and executable files.

## Repository layout

```text
skills/<name>/
├── SKILL.md          # trigger description and core workflow
├── references/       # loaded only when the selected workflow needs them
├── scripts|tools/    # deterministic helpers, when needed
├── config|templates/ # static runtime assets, when needed
└── package.json      # optional package metadata

scripts/              # repository validation
tests/                # behavior, regression, and policy tests
evals/                # agent-level trigger and outcome evaluations
```

## Development

Requirements: Node.js 22+, Python 3.10+, and `curl`.

```bash
npm test
npm run validate
npm run test:node
npm run test:python
```

`npm test` validates every skill, checks security policies, runs the
`model-radar` behavior suite, and tests the Python financial helpers. See
[CONTRIBUTING.md](CONTRIBUTING.md) for change requirements and
[CHANGELOG.md](CHANGELOG.md) for release notes.

## License

[MIT](LICENSE) © primexiao. `invest` includes adapted material from
`xbtlin/ai-berkshire` under its original MIT license; see
[`LICENSE.ai-berkshire`](skills/invest/LICENSE.ai-berkshire).
