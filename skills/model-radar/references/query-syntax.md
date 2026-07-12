# Query syntax

Arguments use positional `token:value` form; order does not matter.

## Tokens

| Token | Meaning | Value format | Examples |
| --- | --- | --- | --- |
| `sort` | Sort dimension | preset below | `sort:cheap`, `sort:popular` |
| `price` | Blended USD/MTok | `..max`, `min..`, `min..max`; bare means max | `price:..10` |
| `ctx` | Context length | same ranges; `k`/`m`; bare means minimum | `ctx:128k`, `ctx:128k..1m` |
| `out` | Maximum output | same ranges; bare means minimum | `out:32k` |
| `cap` | Required capabilities (AND) | comma-separated | `cap:tool_use,reasoning` |
| `in` | Required input modalities (AND) | comma-separated | `in:audio,image` |
| `gen` | Required output modalities (AND) | comma-separated | `gen:image` |
| `hf` | Has an OpenRouter `hugging_face_id` | `true` or `false` | `hf:true` |
| `top` | Result limit | integer | `top:5` |
| `preset` | Scoring preset for `recommend` | preset name | `preset:coding` |

- Sort values: `cheap`, `expensive`, `new`, `ctx`, `popular`, `throughput`, `latency`.
- Capabilities: `tool_use`, `reasoning`, `structured_output`, `vision`,
  `long_output`, `prompt_caching`, `web_search`, `audio_input`, `video_input`,
  `file_input`, `image_generation`, `audio_output`.
- Modalities: input `text`, `image`, `audio`, `video`, `file`; output `text`,
  `image`, `audio`.
- Recommend presets: `coding`, `batch`, `chat`, `vision`. Weights and required
  capabilities are defined in `config/presets.json`.

## Natural-language mapping

| User intent | Translation |
| --- | --- |
| Budget under X | `price:..X` |
| At least X / premium tier | `price:X..` |
| At least N context | `ctx:N` |
| Tool use / vision / reasoning | corresponding `cap:` value |
| Structured output / JSON mode | `cap:structured_output` |
| Audio/image input | `in:audio` / `in:image` |
| Image/audio generation | `gen:image` / `gen:audio` |
| Downloadable/open-weight candidates | `hf:true`, then verify repository license/access |
| Cheapest / newest / popular | corresponding `sort:` value |
| Lowest latency / highest throughput | `sort:latency` / `sort:throughput` |
| Coding, batch, chat, or vision workload | `recommend preset:<name>` |
| Market leader / paid validation for task X | `tasks <tag>` |

## Task-spend tags

`tasks <arg>` substring-matches tags. A macro name lists its whole group.

| Scenario | Tag |
| --- | --- |
| Agent workflow / 主循环 | `agent:workflow_execution` |
| Multi-step planning / 任务规划 | `agent:multi_step_planning` |
| Tool dispatch / 工具调度 | `agent:tool_dispatch` |
| Memory extraction / 记忆抽取 | `agent:memory_extraction` |
| Code generation / 写代码 | `code:general_impl` |
| Debugging / 修 bug | `code:debugging` |
| Frontend / UI | `code:frontend_ui` |
| Code review / security review | `code:review_security` |
| Classification / tagging | `classification_tagging` |
| Roleplay / fiction | `roleplay_fiction` |
| Translation | `translation` |
| Customer support | `customer_support` |
| Extraction / ETL | `data:extraction` / `data:transformation` |
| Whole group | `agent`, `code`, `data`, or `general` |

Translate synonyms and other languages to the closest tag. If two tags are
materially plausible, show both rather than silently choosing one.

## Model matching for `compare`

Arguments match in this order:

1. Exact ID, such as `anthropic/claude-sonnet-4-5`.
2. Exact suffix, such as `claude-sonnet-4`; this does not select a `-fast`
   variant.
3. Partial substring on ID or name; the newest matching release wins.

Use exact IDs whenever the user supplies a versioned model.

`open:true` remains a compatibility alias for `hf:true`; do not use it in new
queries because a Hugging Face listing does not establish an open-source
license.
