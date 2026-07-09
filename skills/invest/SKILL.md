---
name: invest
description: Use when 分析股票（A股/港股/美股）、审视持仓组合、精读财报、建立或追踪投资论文、分析黄金或BTC配置，或用户提到 /invest、投研、买入决策、组合体检、金价、币价周期
license: MIT
metadata:
  author: primexiao
  version: "1.0.0"
  upstream: xbtlin/ai-berkshire (MIT)
---

# invest — 统一投资分析

价值投资（四大师框架，吸收自 [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire)，MIT）+ 宏观资产（黄金/BTC）双框架，共用一套反幻觉机制。

## 自我更新

- 使用本 skill 前先运行 `node <skill_dir>/scripts/self-update.js auto`（需 Node 18+；环境没有 Node 则跳过此步，不影响功能）。若 stderr 输出 `INVEST_UPDATED`，重新读取本 SKILL.md 后再继续。
- 安装副本默认每 24 小时最多检查一次 GitHub 源并自动更新；`INVEST_AUTO_UPDATE=0` 关闭。源码 checkout 或本地有未提交改动时自动跳过。
- 其它命令：`status`（查看状态）/ `check`（检查更新）/ `apply`（手动更新）。

## 子命令路由

用法：`/invest <子命令> <参数>`。**只读取所选子命令对应的 reference 文件，不要预加载其它文件。**

| 子命令 | 场景 | 读取 |
|--------|------|------|
| `research <标的>` | 个股深度研究（四大师七步） | `references/research.md` |
| `check <标的...>` | 买入前快筛（六关+镜子测试，支持多标的） | `references/checklist.md` |
| `portfolio <持仓>` | 组合审视（支持股票+黄金+BTC混合持仓） | `references/portfolio.md` |
| `earnings <标的> [期间]` | 财报精读 | `references/earnings.md` |
| `thesis <标的>` | 投资论文建立/季度追踪 | `references/thesis.md` |
| `gold` / `btc` | 黄金/BTC 宏观分析 | `references/macro.md` |
| `data <代码\|gold\|btc>` | 只取数不分析 | 直接调 tools（见下） |

无子命令时按意图路由：单个公司名→research（用户明确说"快速看看"→check）；"我的持仓/组合"→portfolio；"财报/年报/季报"→earnings；"该不该买黄金/BTC、金价、币价"→gold/btc；持仓里混有黄金/BTC→portfolio。意图不明才问，能判断就直接执行并说明选了哪个子命令。

**边界**：黄金/BTC 本体分析一律走 macro，禁止套四大师框架；矿业股、COIN/MSTR 等 crypto 概念股是股票，走 research/check。

## 共享铁律（所有子命令生效）

1. **计算禁止心算**：估值/市值/增速一律调工具——股票用 `tools/financial_rigor.py`，A股行情财务用 `tools/ashare_data.py`，宏观资产用 `tools/macro_data.py`（工具在本 skill 目录下，reference 里的 `<skill_dir>` 指本 skill 的 base directory）
2. **关键数据双源交叉验证**，误差>1%标记；数据源优先级和验证格式见 `references/data-sources.md`（各子命令执行取数时读取）
3. **事实与观点分离**：事实带来源，观点标"观点/推测"，估计标"估计"，不确定就写"数据不足"，禁止用推测填充确定性
4. **强制给结论**：买入/观望/回避（或 增持/维持/减持）+ 具体区间 + 触发条件。禁止"一方面…另一方面…"收尾
5. **报告落盘 `~/investing/`**（reports/、thesis/、portfolio-latest.md）。**该目录含个人持仓与判断，绝不 commit 进任何 git 仓库、绝不对外发送**
6. 免责：输出是研究参考，不是投资建议；历史规律样本有限（尤其 BTC 周期 n=4），必须标注置信度

## 快速取数

```bash
python3 <skill_dir>/tools/ashare_data.py quote|financials|valuation|search <A股代码或关键词>
python3 <skill_dir>/tools/macro_data.py gold|btc|dxy|rates|dashboard
```
