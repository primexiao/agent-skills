# Agent Skills

Community skills for AI coding agents.

## Skills

| Skill | Purpose | Install |
| --- | --- | --- |
| [`model-radar`](skills/model-radar/SKILL.md) | Find, compare, and recommend LLM models on OpenRouter by budget, context window, capabilities, modalities, and popularity. | `npx skills add primexiao/agent-skills --skill model-radar` |

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
