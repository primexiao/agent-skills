import importlib.util
import io
import pathlib
import subprocess
import sys
import unittest
from contextlib import redirect_stdout
from decimal import Decimal


ROOT = pathlib.Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "skills" / "invest" / "tools" / "financial_rigor.py"
SPEC = importlib.util.spec_from_file_location("financial_rigor", MODULE_PATH)
financial_rigor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(financial_rigor)


class FinancialRigorTests(unittest.TestCase):
    def test_exact_calc_uses_decimal_arithmetic(self):
        with redirect_stdout(io.StringIO()):
            result = financial_rigor.exact_calc("0.1 + 0.2")

        self.assertEqual(result, Decimal("0.3"))

    def test_exact_calc_rejects_calls_and_attribute_access(self):
        with redirect_stdout(io.StringIO()):
            result = financial_rigor.exact_calc("__import__('os').getcwd()")

        self.assertIsNone(result)

    def test_cross_validation_keeps_decimal_consensus(self):
        with redirect_stdout(io.StringIO()):
            result = financial_rigor.cross_validate(
                "ratio",
                {"source-a": "0.1", "source-b": "0.2"},
                tolerance_pct="100",
            )

        self.assertEqual(result["consensus"], Decimal("0.15"))

    def test_cross_validation_requires_at_least_two_sources(self):
        with self.assertRaisesRegex(ValueError, "至少.*两个"):
            financial_rigor.cross_validate("revenue", {"annual-report": "100"})

    def test_cross_validation_uses_primary_source_deviation(self):
        with redirect_stdout(io.StringIO()):
            result = financial_rigor.cross_validate(
                "revenue",
                {"annual-report": "1688.38", "api-total-revenue": "1720.54"},
                tolerance_pct="1",
            )

        self.assertFalse(result["all_consistent"])
        self.assertGreater(result["max_deviation_pct"], Decimal("1"))

    def test_zero_reported_market_cap_is_not_a_success(self):
        with redirect_stdout(io.StringIO()):
            result = financial_rigor.verify_market_cap("10", "100", "0")

        self.assertFalse(result)

    def test_three_scenario_cli_does_not_require_unused_share_count(self):
        result = subprocess.run(
            [
                sys.executable,
                str(MODULE_PATH),
                "three-scenario",
                "--price", "100",
                "--eps", "5",
                "--growth", "0.1", "0", "-0.1",
                "--pe", "20", "15", "10",
            ],
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("三情景估值模型", result.stdout)


if __name__ == "__main__":
    unittest.main()
