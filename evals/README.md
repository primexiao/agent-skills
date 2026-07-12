# Skill evaluations

Evaluations stay outside published skill payloads.

- `<skill>/evals.json` follows Anthropic Skill Creator's `evals.json` schema and
  describes end-to-end behavior and verifiable expectations.
- `routing/<skill>.json` is directly consumable by Skill Creator's
  `run_eval.py`; it mixes positive, negative, near-miss, and cross-skill cases.

`npm run validate:evals` checks schema coverage and uniqueness. Agent-level runs
are intentionally separate from deterministic CI because they require a model
runtime and can vary. Record model, date, run count, trigger rate, and failures
when publishing benchmark results; never commit credentials or raw private
prompts.
