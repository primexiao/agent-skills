# 数据源与交叉验证规范

适用于所有子命令。**行情、估值、持仓量和第三方估计等易变数据必须用两个独立来源，误差>1%须标记。审计财务数字以交易所/监管原文为 canonical；第二来源用于检查提取、单位和口径，不得把同一份披露的转载当成独立证据。**

## 股票数据源优先级

| 市场 | 行情/快照 | 财务 canonical | 提取校验/辅助 |
|------|-----------|----------------|---------------|
| A股 | `<skill_dir>/tools/ashare_data.py`（腾讯行情）+ 另一实时源 | 巨潮资讯、上交所/深交所原始披露 | 公司 IR、东方财富（注明 `营业总收入` 等口径） |
| 港股 | 交易所/券商行情 + 另一实时源 | 港交所披露易原始年报/公告 | 公司 IR、AAStocks；ADR 数据不可直接替代港股口径 |
| 美股 | 交易所/可靠行情服务 + 另一实时源 | SEC EDGAR 10-K/10-Q/8-K | 公司 IR、Macrotrends/StockAnalysis（仅辅助核对） |

### A股取数命令（优先于 WebSearch）

```bash
python3 <skill_dir>/tools/ashare_data.py search 茅台      # 查代码
python3 <skill_dir>/tools/ashare_data.py quote 600519     # 实时行情/PE/PB/市值
python3 <skill_dir>/tools/ashare_data.py financials 600519 # 近5年营收/净利/EPS/ROE
python3 <skill_dir>/tools/ashare_data.py valuation 600519  # 估值+市值验算
```

注意：该工具只有主要指标，且东方财富字段 `TOTALOPERATEREVE` 是“营业总收入”。现金流量表、资产负债表和最终财务口径必须回到交易所/监管原始披露。

## 宏观资产数据源

| 指标 | 获取方式 | 备注 |
|------|---------|------|
| 金价/BTC/DXY/实际利率 | `python3 <skill_dir>/tools/macro_data.py dashboard` | BTC/黄金内置双源；DXY/FRED 为单源，影响结论时需补独立来源 |
| 央行购金 | WebSearch: World Gold Council (gold.org) 季度报告 | 标注数据季度 |
| 黄金ETF流量 | WebSearch: WGC ETF flows / GLD tonnage | |
| BTC现货ETF净流入 | WebSearch: Farside Investors (farside.co.uk) | 日度 |
| 链上指标 (MVRV/LTH/交易所余额) | WebSearch: coinglass / blockchain.com / bitcoinmagazinepro | 免费源精度有限，标注来源+日期 |
| COT持仓 | WebSearch: CFTC legacy report 黄金投机净多头 | 周度，延迟3天 |
| 全球M2/美联储净流动性 | WebSearch 或 FRED | 标注口径 |

## 交叉验证执行

```
误差率 = |来源1 - 来源2| / 来源1 × 100%
```

| 误差 | 处理 |
|------|------|
| ≤1% | ✅ 取主源数值，标注两来源 |
| 1%~5% | ⚠️ 标"数据存在差异"，注明两数值和可能原因（GAAP/Non-GAAP、汇率、口径） |
| >5% | ❌ 必须查原始财报核实，不得直接使用 |

呈现格式：

```
收入：1,239亿元 ✅（macrotrends 1,241亿 / stockanalysis 1,237亿，误差0.3%）
```

数值计算一律走工具，禁止心算：

```bash
python3 <skill_dir>/tools/financial_rigor.py verify-market-cap --price {价} --shares {股本} --reported {市值} --currency {币种}
python3 <skill_dir>/tools/financial_rigor.py verify-valuation --price {价} --eps {EPS} --bvps {BPS} --fcf-per-share {FCF} --dividend {股息}
python3 <skill_dir>/tools/financial_rigor.py cross-validate --field {字段} --values '{"源1": 数值, "源2": 数值}' --unit {单位}
python3 <skill_dir>/tools/financial_rigor.py three-scenario --price {价} --eps {EPS} --growth {乐} {中} {悲} --pe {乐} {中} {悲} --currency {币种}
python3 <skill_dir>/tools/financial_rigor.py calc --expr '510 * 9.11e9'
```

## 常见差异原因（不一定是数据错误）

GAAP vs Non-GAAP（利润类最常见）、汇率换算时点、财年定义、合并口径（少数股东权益）、平台更新滞后、现货 vs 期货基差（黄金）。

## 特别规则

- 未上市公司只有一手来源时，数据前标 `[估计]`，不硬凑交叉验证
- 两个二手源都与原始财报不符时，以原始财报为准
- 宏观/链上数据必须标注**数据日期**，超过1个月的数据用于当下判断时须声明时效风险
