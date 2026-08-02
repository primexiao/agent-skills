#!/usr/bin/env python3
"""Validate a fenced, Tab-indented mind-map outline."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


LIST_MARKER = re.compile(r"(?:[-*+]\s+|#{1,6}\s+|\d+[.)]\s+|>\s+)")


def validate(
    source: str,
    *,
    max_levels: int = 4,
    max_nodes: int = 30,
    max_leaf_chars: int = 100,
) -> list[str]:
    errors: list[str] = []
    normalized = source.replace("\r\n", "\n").replace("\r", "\n")
    match = re.fullmatch(r"\s*```text\n(.*?)\n```\s*", normalized, re.DOTALL)
    if not match:
        return ["response must contain exactly one fenced `text` block and no surrounding prose"]

    payload = match.group(1)
    lines = payload.split("\n")
    if any(not line for line in lines):
        errors.append("outline must not contain blank lines")
    if len(lines) > max_nodes:
        errors.append(f"node count {len(lines)} exceeds limit {max_nodes}")

    depths: list[int] = []
    contents: list[str] = []
    for number, line in enumerate(lines, start=1):
        depth = len(line) - len(line.lstrip("\t"))
        content = line[depth:]
        depths.append(depth)
        contents.append(content)

        if not content:
            errors.append(f"line {number}: node text is empty")
            continue
        if content[0].isspace():
            errors.append(f"line {number}: indentation must use Tabs only")
        if "\t" in content:
            errors.append(f"line {number}: Tab is allowed only for leading indentation")
        if line.rstrip() != line:
            errors.append(f"line {number}: trailing whitespace is not allowed")
        if depth >= max_levels:
            errors.append(
                f"line {number}: level {depth + 1} exceeds limit {max_levels}"
            )
        if LIST_MARKER.match(content):
            errors.append(f"line {number}: remove Markdown/list marker")

    if depths:
        if depths[0] != 0:
            errors.append("first node must be the root at level 1")
        root_count = sum(depth == 0 for depth in depths)
        if root_count != 1:
            errors.append(f"outline must have exactly one root; found {root_count}")
        for index in range(1, len(depths)):
            if depths[index] > depths[index - 1] + 1:
                errors.append(
                    f"line {index + 1}: depth jumps from level "
                    f"{depths[index - 1] + 1} to {depths[index] + 1}"
                )

        for index, (depth, content) in enumerate(zip(depths, contents)):
            next_depth = depths[index + 1] if index + 1 < len(depths) else -1
            if next_depth <= depth and len(content) > max_leaf_chars:
                errors.append(
                    f"line {index + 1}: leaf length {len(content)} exceeds limit "
                    f"{max_leaf_chars}"
                )

    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", nargs="?", help="Draft response file; reads stdin if omitted")
    parser.add_argument("--max-levels", type=int, default=4)
    parser.add_argument("--max-nodes", type=int, default=30)
    parser.add_argument("--max-leaf-chars", type=int, default=100)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if min(args.max_levels, args.max_nodes, args.max_leaf_chars) < 1:
        print("all limits must be positive integers", file=sys.stderr)
        return 2

    source = Path(args.file).read_text(encoding="utf-8") if args.file else sys.stdin.read()
    errors = validate(
        source,
        max_levels=args.max_levels,
        max_nodes=args.max_nodes,
        max_leaf_chars=args.max_leaf_chars,
    )
    if errors:
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
        return 1
    print("outline is valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
