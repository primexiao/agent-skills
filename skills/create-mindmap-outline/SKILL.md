---
name: create-mindmap-outline
description: Convert a conversation, document, notes, research, or a previous answer into a concise, paste-ready mind-map outline using literal Tab indentation. Use when the user asks for 思维导图格式, 可粘贴到思维导图/XMind/幕布/飞书思维导图, tab-indented outline, or asks to repair such an outline. Default to one fenced text block, one node per line, no blank lines, at most 4 levels and 30 nodes, and leaves no longer than 100 characters. Do not use when the user explicitly requests Mermaid, OPML, a vendor-native mind-map file, Markdown headings, or a bulleted/numbered Markdown list.
license: MIT
metadata:
  author: primexiao
  version: "1.0.0"
---

# Create Mind Map Outline

Transform source material into a compact hierarchy that can be copied directly into a mind-map tool. Treat “思维导图 Markdown” as a transport request for a Tab-indented plain-text outline unless the user explicitly names another format.

## Output Contract

Unless the user overrides a constraint, apply all of these rules:

1. Return exactly one fenced code block labeled `text`, with no prose before or after it.
2. Put exactly one node on each line. Use one literal Tab character per hierarchy level; never use spaces for indentation.
3. Use no blank lines, bullets, numbering, Markdown headings, block quotes, or decorative separators.
4. Produce exactly one root node. Count the root as level 1 and allow at most 4 levels total.
5. Allow at most 30 nodes total, counting every non-empty line, including internal nodes and the root.
6. Keep every leaf at no more than 100 Unicode characters. Prefer shorter internal-node labels as well.
7. Keep each node on one source line even if the renderer visually wraps it.

The payload must look like this; the indentation shown inside the block uses literal Tabs:

```text
Community Garden Project
	Goals
		Grow seasonal vegetables for local residents
		Reduce neighborhood food waste through composting
	Planning
		Site Preparation
			Test the soil and install raised beds
		Volunteer Schedule
			Assign weekly watering and maintenance shifts
	Risks
		Limited water access during summer
```

## Workflow

1. Read the user's explicit format limits first. Explicit limits override the defaults above, but the single-block and literal-Tab rules remain unless the user requests another serialization format.
2. Identify the intended subject and choose one concise root label.
3. Retain only decision-relevant conclusions, facts, constraints, risks, recommendations, and unresolved points. Remove repetition, conversational history, rhetorical transitions, and supporting detail that does not change the conclusion.
4. Group related items under short category nodes. Prefer 2–6 children per internal node. Merge overlapping branches before shortening individual leaves.
5. Make leaves self-contained. Preserve uncertainty labels such as “未公开”“推测”“待验证”; never turn an inference into a fact.
6. Serialize the hierarchy only after the content has been compressed to fit the depth, node, and leaf limits.
7. Validate the final serialized response before sending it.

## Constraint Resolution

- If the source is too large, preserve high-impact conclusions and delete low-value detail. Do not silently exceed the requested limits.
- If preserving every requested topic would exceed the node limit, merge sibling topics and compress leaves while retaining distinct decisions and risks.
- If the user requests citations, keep only the minimum decision-relevant source nodes or inline links that fit the limits. Do not fabricate shortened URLs.
- If the user supplies an existing hierarchy, preserve its meaning but repair split code blocks, blank lines, space indentation, Markdown markers, multiple roots, and depth jumps.
- If the user explicitly requests a different serialization format, follow that format instead of this skill's Tab-outline contract.

## Validation

Before sending, check all of the following:

- one `text` code block and nothing else;
- one root, no blank lines, and one node per line;
- leading indentation contains only literal Tabs;
- depth never jumps by more than one level;
- level count, total node count, and leaf length satisfy the active limits;
- no bullet, heading, or numbered-list prefixes remain.

When Python and file tools are available, save the complete draft response to a temporary file and run:

```bash
python3 <skill_dir>/scripts/validate_outline.py <draft-file>
```

Pass `--max-levels`, `--max-nodes`, or `--max-leaf-chars` when the user overrides the defaults. Fix every reported error before sending. If tools are unavailable, perform the same checks manually.
