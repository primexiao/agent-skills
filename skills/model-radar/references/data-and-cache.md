# Data, cache, and limitations

## Cache

```text
$XDG_CACHE_HOME/model-radar/ (or ~/.cache/model-radar/)
  raw.json       # normalized frontend cards, TTL 6h
  models.json    # pricing and capabilities, TTL 6h
  rankings.json  # rankings, analytics, benchmarks, perf, task spend, TTL 24h
<skill_dir>/config/
  presets.json
  tier1-categories.json
```

- The user cache is runtime state and is not committed. Set
  `MODEL_RADAR_CACHE_DIR` when the runtime needs an explicit writable path.
- Expired data refreshes with a 10-second request timeout.
- A failed refresh falls back to stale cache and emits a warning on stderr.
- A fresh installation requires network access and write permission for the
  user cache. In a restrictive sandbox, grant that path or set
  `MODEL_RADAR_CACHE_DIR` to an approved writable directory.

## Public endpoints

- Model cards: `https://openrouter.ai/api/frontend/v1/models/find?active=true&fmt=cards`
- Rankings: the same endpoint with `order=top-weekly`,
  `order=throughput-high-to-low`, and `order=latency-low-to-high`
- Task spend: `https://openrouter.ai/api/frontend/v1/rankings/task-spend`

Cards also carry Artificial Analysis indices, Design Arena Elo, and recent
endpoint latency/throughput data when OpenRouter provides them.

## Limitations

- These are undocumented frontend endpoints and can change without notice.
- Task spend is optional; ranking refresh still succeeds when it is unavailable.
- Prices and capabilities describe OpenRouter's current catalog, not every
  provider deployment of the same underlying model.
- `hugging_face_id` indicates a listing only. License, weight access, and usage
  restrictions must be verified at the linked model repository.
- Popularity, spend, and production telemetry are observational signals. They do
  not control for prompting, routing, provider, workload difficulty, or quality.
