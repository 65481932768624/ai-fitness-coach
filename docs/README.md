# 动作库文档与生成器

本目录保存动作库的数据来源、提取报告、语音提示清单，以及可复现的生成脚本。

## 目录

| 路径 | 内容 |
|---|---|
| `data/manual83.json` | 第二批 83 个动作的结构化数据（由手册 DOCX 解析） |
| `data/manual-extract.json` | 第一批 71 个动作的结构化数据 |
| `动作需求提取报告-第一批71个.md` | 胸背 71 个动作的逐条提取（机位、可测规则、要点、可测性分级） |
| `动作需求提取报告-第二批83个.md` | 腿臀肩臂核心 83 个动作的逐条提取 |
| `语音提示清单.md` | 10 类通用要领 + 83 条逐动作的三类提示音（入场/周期/纠错） |
| `generators/extract_manual83.py` | 手册 DOCX → `data/manual83.json` |
| `generators/gen_library2.py` | `data/manual83.json` → `src/exercises/library2.generated.ts` + 本清单 |
| `generators/gen_library.py` | 第一批生成器（71 动作） |

## 重新生成

```bash
# 依赖 python-docx；本机可用项目自带的 Python 环境
python docs/generators/gen_library2.py

# 若手册更新，先重新解析；DOCX 路径可用环境变量覆盖
MANUAL83_DOCX="D:/document/全身训练动作教学手册（83个动作）.docx" \
  python docs/generators/extract_manual83.py
python docs/generators/gen_library2.py
```

生成后应重新执行 `npm run typecheck` 与 `node tests/run-tests.mjs`，确认配置仍满足不变量。

## 数据口径

- 角度区间为手册标称值换算的初值，**未经真人视频标定**，上线前需用 `calibrate_pose` 流程重标。
- `metric: 'vAngle'` 表示两点连线与竖直方向夹角（躯干前倾/后仰）；`'hDist'` 表示水平距离百分比（膝内扣、双膝间距）。
- 目标肌群、器材、动作步骤、关键要点、常见错误均取自教学手册原文，未经改写。
