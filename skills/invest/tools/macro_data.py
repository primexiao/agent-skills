#!/usr/bin/env python3
"""宏观资产数据工具 — 黄金 / BTC / 美元指数 / 实际利率，零外部依赖（仅 stdlib）。

为 /invest 的 gold / btc 子命令提供数据。BTC 与黄金内置双源；DXY 与 FRED 指标为单源。
风格与数据链路沿用 xbtlin/ai-berkshire (MIT) 的 ashare_data.py 模式。

用法（由 Skill 自动调用）:
    python3 tools/macro_data.py btc          # BTC 现价（CoinGecko+Coinbase 双源）+ 52周区间
    python3 tools/macro_data.py gold         # 伦敦金现货 + COMEX 期货（含基差提示）
    python3 tools/macro_data.py rates        # 10Y TIPS 实际利率 + 盈亏平衡通胀（FRED）
    python3 tools/macro_data.py dxy          # 美元指数
    python3 tools/macro_data.py dashboard    # 以上全部，紧凑输出

数据源（全部免费、无需 key）:
    BTC:  api.coingecko.com（主）+ api.coinbase.com（副）+ Yahoo BTC-USD（52周区间）
    黄金: hq.sinajs.cn hf_XAU 伦敦金现货（主）+ Yahoo GC=F COMEX期货（副，有基差）
    利率: fred.stlouisfed.org fredgraph.csv — DFII10 / T10YIE
    DXY:  Yahoo DX-Y.NYB
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone

_TIMEOUT = 15


def _curl(url, headers=None, browser_ua=True):
    """请求 URL，并遵循用户配置的系统代理。

    browser_ua=False 时用 curl 默认 UA（FRED 对浏览器 UA 返回空 body）。
    """
    ua = (["-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"]
          if browser_ua else [])
    cmd = ["curl", "-fsS", "-m", str(_TIMEOUT), *ua]
    for h in headers or []:
        cmd += ["-H", h]
    cmd.append(url)
    result = subprocess.run(cmd, capture_output=True, timeout=_TIMEOUT + 5)
    if result.returncode == 0 and result.stdout.strip():
        try:
            return result.stdout.decode("utf-8")
        except UnicodeDecodeError:
            return result.stdout.decode("gbk", errors="replace")
    raise ConnectionError(f"请求失败: {url}")


def _deviation_pct(a, b):
    return abs(a - b) / a * 100 if a else 0.0


def _dev_mark(dev, warn=0.5):
    return "✅" if dev <= warn else "⚠️"


# ---------------------------------------------------------------------------
# 数据获取
# ---------------------------------------------------------------------------

def fetch_btc():
    """BTC 双源价格 + 52周区间。返回 dict，单源失败不致命。"""
    out = {"sources": {}}
    try:
        d = json.loads(_curl(
            "https://api.coingecko.com/api/v3/simple/price"
            "?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
        ))["bitcoin"]
        out["sources"]["CoinGecko"] = d["usd"]
        out["change_24h"] = d.get("usd_24h_change")
        out["market_cap"] = d.get("usd_market_cap")
    except Exception:
        pass
    try:
        d = json.loads(_curl("https://api.coinbase.com/v2/prices/BTC-USD/spot"))
        out["sources"]["Coinbase"] = float(d["data"]["amount"])
    except Exception:
        pass
    if not out["sources"]:
        try:  # 兜底第三源
            d = json.loads(_curl("https://api.kraken.com/0/public/Ticker?pair=XBTUSD"))
            out["sources"]["Kraken"] = float(d["result"]["XXBTZUSD"]["c"][0])
        except Exception:
            pass
    try:
        meta = json.loads(_curl(
            "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1d&range=1y"
        ))["chart"]["result"][0]["meta"]
        out["high_52w"] = meta.get("fiftyTwoWeekHigh")
        out["low_52w"] = meta.get("fiftyTwoWeekLow")
    except Exception:
        pass
    return out


def fetch_gold():
    """伦敦金现货（sina）+ COMEX 期货（yahoo）。两者有天然基差，非数据错误。"""
    out = {}
    try:
        raw = _curl("https://hq.sinajs.cn/list=hf_XAU",
                    headers=["Referer: https://finance.sina.com.cn"])
        fields = raw.split('"')[1].split(",")
        out["spot"] = float(fields[0])          # 最新价
        out["spot_prev_close"] = float(fields[7])
        out["spot_date"] = fields[12]
    except Exception:
        pass
    try:
        meta = json.loads(_curl(
            "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1y"
        ))["chart"]["result"][0]["meta"]
        out["futures"] = meta.get("regularMarketPrice")
        out["high_52w"] = meta.get("fiftyTwoWeekHigh")
        out["low_52w"] = meta.get("fiftyTwoWeekLow")
    except Exception:
        pass
    return out


def fetch_fred_series(series_id, days=400):
    """FRED CSV，返回 [(date, value)]，跳过空值。"""
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    raw = _curl(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={start}",
                browser_ua=False)
    rows = []
    for line in raw.strip().splitlines()[1:]:
        parts = line.split(",")
        if len(parts) == 2 and parts[1] not in ("", "."):
            try:
                rows.append((parts[0], float(parts[1])))
            except ValueError:
                continue
    return rows


def fetch_dxy():
    meta = json.loads(_curl(
        "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1y"
    ))["chart"]["result"][0]["meta"]
    return {"price": meta.get("regularMarketPrice"),
            "high_52w": meta.get("fiftyTwoWeekHigh"),
            "low_52w": meta.get("fiftyTwoWeekLow")}


# ---------------------------------------------------------------------------
# 输出
# ---------------------------------------------------------------------------

def _pos_in_range(price, low, high):
    """价格在52周区间中的位置（0-100%）。"""
    if not all(isinstance(x, (int, float)) for x in (price, low, high)) or high <= low:
        return None
    return (price - low) / (high - low) * 100


def print_btc():
    d = fetch_btc()
    print("=" * 60)
    print("BTC / USD")
    print("=" * 60)
    if not d["sources"]:
        print("  ❌ 全部数据源失败，改用 WebSearch 取价并注明来源")
        return
    for src, p in d["sources"].items():
        print(f"  {src:10s}: ${p:,.0f}")
    prices = list(d["sources"].values())
    if len(prices) >= 2:
        dev = _deviation_pct(prices[0], prices[1])
        print(f"  双源偏差:   {dev:.2f}% {_dev_mark(dev)}")
    else:
        print("  ⚠️ 仅单源可用，数据未经交叉验证")
    if d.get("change_24h") is not None:
        print(f"  24h涨跌:    {d['change_24h']:+.2f}%")
    if d.get("market_cap"):
        print(f"  总市值:     ${d['market_cap']/1e12:.2f}万亿")
    if d.get("high_52w"):
        print(f"  52周区间:   ${d['low_52w']:,.0f} — ${d['high_52w']:,.0f}")
        pos = _pos_in_range(prices[0], d["low_52w"], d["high_52w"])
        if pos is not None:
            print(f"  区间位置:   {pos:.0f}%（0%=52周低点）")
            drawdown = (prices[0] / d["high_52w"] - 1) * 100
            print(f"  距前高:     {drawdown:+.1f}%")


def print_gold():
    d = fetch_gold()
    print("=" * 60)
    print("黄金 / USD每盎司")
    print("=" * 60)
    if not d:
        print("  ❌ 全部数据源失败，改用 WebSearch 取价并注明来源")
        return
    if d.get("spot"):
        chg = (d["spot"] / d["spot_prev_close"] - 1) * 100 if d.get("spot_prev_close") else 0
        print(f"  伦敦金现货: ${d['spot']:,.2f}  ({chg:+.2f}%)  [sina hf_XAU {d.get('spot_date','')}]")
    if d.get("futures"):
        print(f"  COMEX期货:  ${d['futures']:,.2f}  [Yahoo GC=F]")
    if d.get("spot") and d.get("futures"):
        dev = _deviation_pct(d["spot"], d["futures"])
        mark = "✅" if dev <= 1.5 else "⚠️"
        print(f"  现货/期货差: {dev:.2f}% {mark}（正常基差范围内≤1.5%，非数据错误）")
    if d.get("high_52w"):
        print(f"  52周区间:   ${d['low_52w']:,.1f} — ${d['high_52w']:,.1f}（期货口径）")
        ref = d.get("spot") or d.get("futures")
        pos = _pos_in_range(ref, d["low_52w"], d["high_52w"])
        if pos is not None:
            print(f"  区间位置:   {pos:.0f}%（0%=52周低点）")


def print_rates():
    print("=" * 60)
    print("美债利率环境（FRED，日度）")
    print("=" * 60)
    try:
        real = fetch_fred_series("DFII10")
        bei = fetch_fred_series("T10YIE")
    except Exception:
        print("  ❌ FRED 请求失败，改用 WebSearch 查询 10Y TIPS 收益率")
        return
    if real:
        date, latest = real[-1]
        ago = real[0][1]
        print(f"  10Y实际利率(TIPS): {latest:.2f}%  [{date}]")
        print(f"    一年前:          {ago:.2f}%  （变动 {latest-ago:+.2f}pp）")
        print(f"    → 实际利率与金价长期负相关；2022后央行购金削弱该关系，需检验当前 regime")
    if bei:
        date, latest_bei = bei[-1]
        print(f"  10Y盈亏平衡通胀:   {latest_bei:.2f}%  [{date}]")
        if real:
            print(f"  10Y名义利率(推算): {real[-1][1]+latest_bei:.2f}%")


def print_dxy():
    print("=" * 60)
    print("美元指数 DXY")
    print("=" * 60)
    try:
        d = fetch_dxy()
    except Exception:
        print("  ❌ 数据源失败，改用 WebSearch")
        return
    print(f"  最新:       {d['price']:.2f}  [Yahoo DX-Y.NYB]")
    if d.get("high_52w"):
        print(f"  52周区间:   {d['low_52w']:.2f} — {d['high_52w']:.2f}")
        pos = _pos_in_range(d["price"], d["low_52w"], d["high_52w"])
        if pos is not None:
            print(f"  区间位置:   {pos:.0f}%")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "dashboard"
    if cmd == "btc":
        print_btc()
    elif cmd == "gold":
        print_gold()
    elif cmd == "rates":
        print_rates()
    elif cmd == "dxy":
        print_dxy()
    elif cmd == "dashboard":
        print_gold(); print(); print_btc(); print(); print_dxy(); print(); print_rates()
        print()
        china_time = datetime.now(timezone(timedelta(hours=8)))
        print(f"  数据时间: {china_time.strftime('%Y-%m-%d %H:%M')} UTC+8")
        print("  ⚠️ 链上指标(MVRV/ETF流量/央行购金)不在本工具内，须 WebSearch 并标注来源+日期")
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
