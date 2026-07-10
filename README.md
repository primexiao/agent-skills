# Agent Skills

Community skills for AI coding agents.

## Skills

| Skill | Purpose | Install |
| --- | --- | --- |
| [`model-radar`](skills/model-radar/SKILL.md) | Find, compare, and recommend LLM models on OpenRouter by budget, context window, capabilities, modalities, and popularity. | `npx skills add primexiao/agent-skills --skill model-radar` |
| [`invest`](skills/invest/SKILL.md) | Unified investment research (Chinese-language): stock deep-dives, buy checklists, portfolio review, earnings reading, thesis tracking, plus gold/BTC macro analysis — one skill, subcommand routing. | `npx skills add primexiao/agent-skills --skill invest` |
| [`topic`](skills/topic/SKILL.md) | Turn any directory into a flat topic archive: one isolated subdirectory per idea/topic, a thin INDEX + log knowledge layer at the root, with `init` / new-topic / `lint` workflows. | `npx skills add primexiao/agent-skills --skill topic` |
| [`publish-my-skill`](skills/publish-my-skill/SKILL.md) | Publish or update Prime's Agent Skills in the public primexiao/agent-skills GitHub repository and make them installable through skills.sh. | `npx skills add primexiao/agent-skills --skill publish-my-skill` |

## Model Radar

`model-radar` translates natural-language model selection requests into a small
`token:value` grammar, runs a dependency-free Node CLI against OpenRouter model metadata, and
returns JSON for the agent to render as a markdown table.

Example:

```text
User: what's the cheapest model with vision and tool use under $5/MTok?
Agent: node scripts/main.js list sort:cheap cap:vision,tool_use price:..5 top:5
```

Requirements:

- Node.js 18+ on `PATH`
- Network egress to `openrouter.ai` on first run
- No API key; it uses OpenRouter public endpoints

## Invest

`invest` is a Chinese-language investment research skill with subcommand routing
(`/invest research|check|portfolio|earnings|thesis|gold|btc|data`). It combines a
value-investing framework (absorbed from [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire),
MIT — license text included as `skills/invest/LICENSE.ai-berkshire`) with a new
gold/BTC macro framework, sharing one anti-hallucination discipline: no mental
math (Decimal-exact Python tools), dual-source cross-validation for key figures,
three-scenario valuation, and forced conclusions with price bands and triggers.

Requirements:

- Python 3.8+ and `curl` on `PATH`
- Node.js 18+ for self-update (optional — the skill works without it; installed copies check the GitHub source at most once every 24h, disable with `INVEST_AUTO_UPDATE=0`)
- An agent runtime with web search (research/earnings/portfolio subcommands); `data` works offline against free public quote APIs
- No API keys; data sources are free public endpoints (Tencent/Eastmoney quotes, Sina/Yahoo gold, CoinGecko/Coinbase BTC, FRED rates)
- Reports are written to `~/investing/` (private by convention — keep it out of git)

## Topic

`topic` turns a directory of scattered idea folders into a flat topic archive:
each topic is an isolated subdirectory; the root carries only control files
(`AGENTS.md`, `CLAUDE.md`, `INDEX.md`, `log.md`).

- `/topic init [dir]` — audit an existing directory (parallel scan, secret
  detection, tool-cache triage, code placement) and initialize it behind a
  proposal → confirm gate; destructive items are confirmed one by one.
- `/topic <one-liner>` — start a new topic (or merge into an existing one) in
  the current archive without ever restructuring the root.
- `/topic lint` — five drift checks (unregistered dirs, stale index dates,
  missing READMEs, stray root files, new tool caches) with safe auto-fixes.

Rules persist in the target directory's own `AGENTS.md`, so the archive keeps
working even for agents without the skill installed. Self-updates use the same
mechanism as `model-radar` (24h-throttled check against this repo; opt out with
`TOPIC_SKILL_AUTO_UPDATE=0`).

## Layout

```text
README.md
LICENSE
skills/
  model-radar/
    SKILL.md
    package.json
    scripts/
    config/
```

Each skill lives in its own `skills/<name>/` directory so `npx skills add`
installs the full skill payload with scripts and config files.

## Development

```bash
npm test
node skills/model-radar/scripts/main.js list sort:cheap top:5
```

Development is plain Node.js: no alternate runtime, transpile step, or build step.
`scripts/*.js` is the canonical source.

## License

[MIT](LICENSE) © primexiao
