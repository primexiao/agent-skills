import importlib.util
import pathlib
import io
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest.mock import patch


ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOLS = ROOT / "skills" / "invest" / "tools"


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOLS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ashare_data = load("ashare_data")
macro_data = load("macro_data")


def quote_payload():
    fields = [""] * 88
    fields[1] = "贵州茅台"
    fields[2] = "600519"
    fields[3] = "1204.98"
    fields[4] = "1182.19"
    fields[5] = "1183.00"
    fields[6] = "52213"
    fields[30] = "20260710161445"
    fields[31] = "22.79"
    fields[32] = "1.93"
    fields[33] = "1204.98"
    fields[34] = "1170.28"
    fields[37] = "622334"
    fields[38] = "0.42"
    fields[39] = "18.21"
    fields[44] = "15063.23"
    fields[45] = "15063.23"
    fields[46] = "6.47"
    fields[47] = "1300.41"
    fields[48] = "1063.97"
    return f'v_sh600519="{"~".join(fields)}";'


class AShareDataTests(unittest.TestCase):
    def test_stock_codes_are_validated_and_normalized(self):
        self.assertEqual(ashare_data._qq_code("600519.SH"), "sh600519")
        self.assertEqual(ashare_data._qq_code("000001.sz"), "sz000001")
        self.assertEqual(ashare_data._qq_code("430047.BJ"), "bj430047")

        for invalid in ("abc", "60051", "600519;rm", "1234567"):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    ashare_data._qq_code(invalid)

    def test_curl_fails_on_http_errors_and_has_a_network_timeout(self):
        response = SimpleNamespace(returncode=0, stdout=b"{}")
        with patch.object(ashare_data.subprocess, "run", return_value=response) as run:
            ashare_data._curl("https://example.com/data")

        command = run.call_args.args[0]
        self.assertIn("-f", command[1])
        self.assertIn("-m", command)

    def test_quote_parser_exposes_the_source_timestamp(self):
        parsed = ashare_data._parse_qq_quote(quote_payload())

        self.assertEqual(parsed["source_time"], "2026-07-10 16:14:45 Asia/Shanghai")

    def test_financials_labels_total_operating_revenue_precisely(self):
        reports = {
            "result": {
                "data": [
                    {
                        "REPORT_DATE": "2025-12-31",
                        "REPORT_DATE_NAME": "2025年报",
                        "TOTALOPERATEREVE": 172054000000,
                    }
                ]
            }
        }
        with patch.object(ashare_data, "_curl", return_value=quote_payload()), \
             patch.object(ashare_data, "_curl_json", return_value=reports), \
             redirect_stdout(io.StringIO()) as output:
            ashare_data.cmd_financials("600519")

        self.assertIn("营业总收入", output.getvalue())
        self.assertNotIn("\n  营收:", output.getvalue())

    def test_valuation_does_not_circularly_validate_market_cap(self):
        with patch.object(ashare_data, "_curl", return_value=quote_payload()), \
             redirect_stdout(io.StringIO()) as output:
            ashare_data.cmd_valuation("600519")

        self.assertIn("未独立验证", output.getvalue())
        self.assertNotIn("一致（推算法", output.getvalue())


class MacroDataTests(unittest.TestCase):
    def test_curl_fails_on_http_errors_and_has_a_network_timeout(self):
        response = SimpleNamespace(returncode=0, stdout=b"{}")
        with patch.object(macro_data.subprocess, "run", return_value=response) as run:
            macro_data._curl("https://example.com/data")

        command = run.call_args.args[0]
        self.assertIn("-f", command[1])
        self.assertIn("-m", command)


if __name__ == "__main__":
    unittest.main()
