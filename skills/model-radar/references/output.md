# Output contract

Always transform CLI JSON into a markdown table. Preserve numeric precision
that matters for comparison, but do not expose internal fields the user did not
ask for.

## `list`

| # | Model | $/MTok (P/C/Blend) | Ctx | Output | Caps | Pop# |
| --- | --- | --- | --- | --- | --- | --- |

- Use short capability tags such as `tool`, `reason`, and `vision`.
- Popularity rank is `—` when rankings are absent or stale.

## `recommend`

| Rank | Model | Score | Cost↑ | Ctx↑ | Out↑ | Cap↑ | $/MTok | Bench (I/C/A) | Caps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Add one sentence per model explaining the decisive score dimensions and the
main downside. Scores are in `[0, 1]`. Flag cheap-but-weak results when benchmark
evidence materially trails established alternatives.

## `compare`

Use a vertical table with one model per column and these rows when available:

- price (prompt/completion/blended), context, and maximum output;
- input/output modalities and capabilities;
- popularity rank and weekly requests;
- Artificial Analysis intelligence/coding/agentic indices;
- Design Arena Elo;
- p50 latency and throughput;
- tool-call error rate (`error requests / requests`).

The performance window is short production telemetry, not a benchmark. Render
missing values as `—`.

## `tasks`

Without a tag:

| # | Task | Group | % of all spend | Spend leader |
| --- | --- | --- | --- | --- |

With a tag:

| # | Model | Share of task spend | $/MTok | Ctx | Bench (I/C/A) |
| --- | --- | --- | --- | --- | --- |

State `window_days` and that shares represent spend in dollars, not token
volume. For a recommendation, identify the spend leader and one credible cheaper
challenger when the data supports both.

## Footer

Always end with `Data as of {fetched_at}`. If the timestamp is older than 12
hours, disclose staleness and suggest `node scripts/main.js refresh`.
