from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "skills" / "create-mindmap-outline" / "scripts" / "validate_outline.py"
SPEC = importlib.util.spec_from_file_location("validate_outline", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ValidateOutlineTests(unittest.TestCase):
    def test_accepts_single_tab_indented_text_block(self) -> None:
        source = """```text
主题
\t分支一
\t\t结论一
\t分支二
\t\t结论二
```"""
        self.assertEqual(MODULE.validate(source), [])

    def test_rejects_surrounding_prose_and_split_blocks(self) -> None:
        source = "结果：\n```text\n主题\n```\n```text\n另一个根\n```"
        self.assertTrue(MODULE.validate(source))

    def test_rejects_blank_lines_spaces_markers_and_multiple_roots(self) -> None:
        source = """```text
主题

  - 空格缩进
另一个根
```"""
        errors = "\n".join(MODULE.validate(source))
        self.assertIn("blank lines", errors)
        self.assertIn("Tabs only", errors)
        self.assertIn("exactly one root", errors)

    def test_enforces_levels_nodes_and_leaf_length(self) -> None:
        source = """```text
主题
\t分支
\t\t子分支
\t\t\t过长叶子
```"""
        errors = "\n".join(
            MODULE.validate(source, max_levels=3, max_nodes=3, max_leaf_chars=3)
        )
        self.assertIn("node count", errors)
        self.assertIn("exceeds limit 3", errors)
        self.assertIn("leaf length", errors)

    def test_rejects_depth_jump(self) -> None:
        source = "```text\n主题\n\t\t跳级\n```"
        errors = "\n".join(MODULE.validate(source))
        self.assertIn("depth jumps", errors)


if __name__ == "__main__":
    unittest.main()
