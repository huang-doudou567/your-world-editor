---
name: your-world-editor
description: |
  你的世界编辑器 — 一套基于三层文件结构的自我认知系统。
  
  记录层降低摩擦：智能事件接入自动判断什么值得记，不用等触发词。
  检索层对抗遗忘：关键词+语义搜索，问"上次跟XX吵架时我怎么想的"能捞回来。
  洞察层跨越碎片：主题聚类+周期性检测+盲区趋势追踪，从三个月流水账里自动发现"你又开始了"。
  
  首次使用触发词：「搭建」「启动」「初始化」「人生系统」— 进入 7 步引导，5 分钟搭好。
  日常使用：说话就行，不用记命令。
---

# 你的世界编辑器 · 核心系统

## 产品思路

**问题**：人的自我认知依赖记忆，但记忆是衰减的、碎片的、情绪偏差的。三个月前为什么做了那个决定、当时怎么想的、这已经是第几次了——说不清楚。这个信息不对称导致两个后果：做决策时调用不了完整信息源；反复踩同一个坑而不自知，因为上一次的痛已经模糊了。

**解法**：把"人生回溯"拆成三个独立的技术问题，各用一个模块解决——

| 层 | 解决什么 | 怎么解决 | 模块 |
|---|---|---|---|
| **记录层** | 降低记录摩擦 | 智能信号打分 — 不用等触发词，自动判断什么值得记 | `scripts/corpus/event_intake.py` |
| **检索层** | 对抗遗忘 | 关键词+多维度加权搜索 — 模糊记得一点就能捞回来 | `scripts/corpus/store.py → search_entries()` |
| **洞察层** | 跨越碎片 | 主题聚类+周期检测+盲区趋势 — 自动发现"你又开始了" | `scripts/corpus/pattern_cluster.py` |

三层之上有指标：盲区再现率下降了吗？merge 率在增长吗？系统用起来了吗？——数据闭环。

## 三层文件结构

| 层 | 文件 | 比喻 | 装什么 |
|---|------|------|--------|
| **事件层** | `经历流水账.md` | 收件箱 | 发生的事，倒序，随手记 |
| **规律层** | `模式与盲点.md` | 雷达 | 怎么运转 / 容易栽的坑 / 情绪触发 |
| **叙事层** | `我的故事.md` | 图书馆 | 判断框架、价值观、人生叙事 |

三层不重复——事件流入，规律提炼，叙事沉淀。

## 工具（用项目目录下的 Python 运行）

### 记录层
- `python scripts/corpus/event_intake.py` — 智能事件接入：`assess_record_worthiness(text) -> {score, tag, title, reasons}`；`process_intake(text, system_dir)` 高置信度直接写入
- `python scripts/corpus/store.py` — 追加流水账、同步模式案例日志、merge 到叙事层

### 检索层
- `python scripts/corpus/store.py` — `search_entries(system_dir, query, top_n=10)` — 多维度加权搜索，标题命中 > 正文命中 > 标签命中，近期加权
- `python scripts/corpus/store.py` — `find_related_entries(system_dir, topic_words)` — 按主题词找关联事件

### 洞察层
- `python scripts/corpus/pattern_cluster.py` — `generate_insights(system_dir)` — 一键生成主题聚类、周期性检测、盲区趋势、merge 候选
- `python scripts/corpus/pattern_cluster.py` — `detect_temporal_patterns(entries)` — 星期周期性/密集爆发期/长期趋势
- `python scripts/corpus/pattern_cluster.py` — `detect_pattern_recurrence(patterns, entries)` — 每个盲区的近期❌/✅比例变化

### 评估层
- `python scripts/eval/metrics.py` — `generate_eval_report(system_dir)` — 系统健康度/盲区改善度/叙事沉淀率 三维评分

### 数据模型
- 所有工具基于 `models.py` 的结构化数据类型（Event / Pattern / Decision / WeeklyReview），Agent 推理与 Python 执行通过磁盘文件解耦

---

## 输入层（多模态接入）

| 输入形式 | 处理方式 | 典型场景 |
|---------|---------|---------|
| **文字** | 智能信号打分 → 自动判断记录价值 | 日常对话、随口说的 |
| **语音** | ASR 转文字 → 信号打分 | 语音备忘录、走路时随口说 |
| **图片** | OCR/视觉理解 → 结构化提取 | 体检报告截图、手写笔记 |
| **链接** | 网页抓取 → 内容提取 | 文章/帖子/产品页面 |
| **文档** | 文件解析 → 内容提取 | PDF报告、Word简历 |

所有输入统一转为 Event 结构。降级时标记而非报错。

---

## 触发词体系

### 主系统

| 场景 | 触发词（任意命中即路由） |
|------|------------------------|
| **记流水账** | 「记一下」「今天」「刚刚」「有个事」「记个事」 |
| **辅助决策** | 「帮我做决策」「要不要」「纠结」「该不该」「选A还是B」 |
| **沉淀叙事** | 「merge」「沉淀」「总结」「整理一下」「值得记住」 |
| **周复盘** | 「周复盘」「照镜子」「这周怎么样」「回顾」「反思」 |
| **检索回忆** | 「上次」「之前」「三个月前」「那时候」「找一下」「搜一下」「我那会」 |
| **书摘联动** | 「刷新书摘」「收藏这句话」「金句」「摘一句」「划线」 |
| **系统评估** | 「系统评估」「效果怎么样」「用下来感觉」「进步了吗」 |
| **首次搭建** | 「搭建」「启动」「初始化」「第一次用」 |

### 子模块

| 子模块 | 触发词 | 路径 |
|--------|--------|------|
| life-jobhunt | 面试/调研/offer/求职 | `sub-skills/life-jobhunt/SKILL.md` |
| life-money | 报价/接单/财务/理财 | `sub-skills/life-money/SKILL.md` |
| life-health | 体检/症状/就诊/健康 | `sub-skills/life-health/SKILL.md` |
| life-love | 恋爱/感情/亲密关系 | `sub-skills/life-love/SKILL.md` |
| life-dream | 梦/做梦/梦境 | `sub-skills/life-dream/SKILL.md` |

### 触发词冲突处理

1. **优先看明确意图**：「面完了」→ 求职，「做了个梦」→ 梦境
2. **模糊时问一句**：「帮我分析一下这件事」→ 是决策还是模式分析？
3. **多模块联动**：「这个 offer 值不值得接，钱太少了」→ 求职 + 财务联动

---

## 数据模型

### Event（事件）
```yaml
timestamp: "YYYY-MM-DD HH:MM"
tag: "决策 | 模式 | 洞察 | ''"
mode: "❌ | ✅ | ''"
title: "一句话标题"
text: "1-5 句描述"
source: "free_text | voice | image | link | document"
pattern_refs: []          # 关联的模式条目
confidence: "high | medium | low"
grounded: true
merged: false
```

### Pattern（模式）
```yaml
name: "模式名称"
type: "positive | blind_spot"
trigger: "什么情境触发"
core: "一句话核心"
root_cause: "根源"
countermeasure: "识别时怎么办"
source: "initial_archive | observed | user_confirmed"
confidence: "high | medium | low"
cases: [{timestamp, symbol: "❌|✅", description, bookquote}]
bookquotes: [{type: "❌|✅|通用", text, source}]
emotional_triggers: []
```

### Decision（决策）
```yaml
timestamp: "YYYY-MM-DD"
context: "决策背景"
choice: "选择"
framework_used: "判断框架"
framework_applied: true
blind_spot_scan: []
reasoning: "理由"
review_date: "YYYY-MM-DD"   # 三个月后回看
actual_outcome: ""           # 回看时的实际结果
outcome_deviation: ""        # 偏差分析
```

---

## 首次使用：7 步引导

### STEP 1 · 打招呼 + 昵称

AI 说：
> 哈喽！欢迎使用你的世界编辑器。
>
> 接下来几个问题，5 分钟搭好你自己的版本。
>
> 📍 第 1 个问题，你的昵称是？

### STEP 2 · 命名 + 文件位置

AI 说：
> 好的 [昵称]～ 我把它命名为「[昵称]的人生系统」。
>
> 📍 第 2 个问题，文件放在哪？
>
> A. 当前项目目录下 `人生系统/`（推荐）
> B. 我自己指定路径

执行：`mkdir -p 人生系统/事件 人生系统/模式 人生系统/叙事`

### STEP 3 · 建文件 + 初始档案

AI 用 `templates/` 下的模板创建 3 个核心文件。

AI 说：
> 📍 第 3 个问题（最关键），有没有关于"你这个人"的资料可以投喂？
>
> 简历 / 自我介绍 / MBTI / 朋友画像 / 成长经历……
>
> 💡 投喂越全，「模式与盲点」越准。最好同时有 ✅ 闪光的事 + ❌ 栽过的坑。
>
> A. 我现在发给你
> B. 跳过，以后慢慢长出来

### STEP 4 · 提炼初版模式

用户选 A → AI 整理入 `我的故事.md`，提炼正反向模式入 `模式与盲点.md`。

AI 说：
> [2-3 句画像总结]
>
> ✅ 正向模式：[...]
> ❌ 可能的盲区：[...]
>
> 初稿，你扫一眼准吗？
> A. 挺准的，继续  B. 有想补充/修正的

### STEP 4.5 · 共建画像

用户选 B → AI 立刻改文件 → 确认 → 循环 → STEP 5。

### STEP 5 · 书摘联动

AI 说：
> 📍 第 4 个问题，你平时收集书摘/金句吗？
>
> （下次栽进同一个坑，递回来的不是 AI 鸡汤，是你自己划过的那句话）
>
> A. 有，我发给你  B. 没有，以后慢慢收集  C. 跳过

### STEP 6 · 试一句流水账

AI 说：
> 📍 最后一个问题，试一句吧：
>
> 直接说：「记一下，今天 ___」

处理完按「日常·场景一」执行。

### STEP 7 · 收尾

AI 说：
> [昵称]～引导完成 ✨
>
> 还可以探索：
> 🔍 周复盘 · 🎯 辅助决策 · 📚 沉淀叙事
> 💼 求职 · 💰 财务 · 🏥 健康 · ❤️ 爱情 · 🌙 梦境

---

## 日常流转规则

### 场景一：智能记录（增强版记录层）

**不只是等触发词。** 用户说话 → Agent 调用 `assess_record_worthiness(text)` 打分。评分 ≥ 8（高置信度）→ 直接建议记录。评分 4-7（中置信度）→ 问用户"要不要记一条？"。

**Pipeline**：

```
1. event_intake(text) → {score, tag, mode, title}          ← Python 信号打分
2. 评分 ≥ 8 → Agent 直接写；评分 4-7 → Agent 问"要不要记？"
3. write_journal(event) → 流水账顶部插入                     ← store.py
4. pattern_match(event, patterns[]) → 扫描模式与盲点          ← Agent 语义判断
5. 命中盲区 → sync_pattern_case + bookquote_link            ← store.py
6. 是洞察 → Agent 扫选题潜力
```

### 场景二：智能搜索（检索层）

**不只是翻流水账。** 用户说"上次跟 XX 吵架那次，我是怎么想的来着"→ 调用 `search_entries(system_dir, query)` 多维度加权搜索。

**Pipeline**：
```
1. search_entries(system_dir, query, top_n=10)   ← Python 加权搜索
2. 展示 TOP 结果（标题 + 日期 + 关联模式）
3. 无精确结果 → 扩大搜索范围（find_related_entries 主题词匹配）
4. 仍然无 → 诚实告知"没有找到相关记录"
```

### 场景三：辅助决策

**Pipeline**：
```
1. read_context() → 读 3 个核心文件
2. apply_framework(context) → 用用户自己的判断框架
3. blind_spot_scan() → 扫描相关盲区
4. output_conclusion() → 直接给结论
5. write_decision() → Decision{} 写入流水账 [决策]
6. schedule_review() → 标记三个月后回看
```

**直接给结论，不给选项。**

### 场景四：Merge 进叙事层

**触发**：「merge 一下」或 3+ 条同主题事件形成集群。

**Pipeline**：
```
1. 调用 generate_insights(system_dir) → merge_candidates  ← Python 聚类自动发现
2. Agent 判断 → merge_to_story(system_dir, section, text)
3. 标记相关事件为 ✅ merged
```

### 场景五：周复盘（递镜模式）

**触发**：「周复盘」「照镜子」

**Pipeline**：
```
1. collect_time_pie() → 用户给本周时间饼图
2. collect_dimensions() → 标方向（↑↑/↑/→/↓/↓↓）
3. 调用 detect_temporal_patterns(entries) → 本周盲区动态    ← Python
4. reflect() → 不打分、不给 to-do，照镜子
5. write_weekly_review() → 存进 人生系统/复盘/
6. generate_eval_report() → 建议触发条件：复盘时            ← Python 评估
```

### 场景六：系统评估（评估层）

**触发**：「系统评估」「效果怎么样」「进步了吗」

Agent 调用 `generate_eval_report(system_dir)`，得到三个维度的评分和建议。基于结果用自然语言告诉用户"系统在使用上是否健康、盲区是否在改善、叙事沉淀节奏如何"。

---

## 降级处理

| 场景 | 降级策略 |
|------|---------|
| `模式与盲点.md` 为空 | 只记流水账，不匹配模式 |
| `我的故事.md` 无判断框架 | `framework_applied: false`，引导建立 |
| 书摘库为空 | `bookquote: None`，不附书摘 |
| 子模块文件不存在 | 首次触发自动建 + `degraded` |
| 数据 < 10 条事件 | 评估报告标注"数据不足" |
| Python 环境不可用 | Agent 退回到纯 SKILL.md 指导模式 |

---

## 子模块联动

| 方向 | 什么时候 | 怎么做 |
|------|---------|--------|
| 子→主 | 重要决策 | 写进 `经历流水账.md`，标 [决策] |
| 子→主 | 命中盲区 | 同步 `模式与盲点.md` 案例日志 |
| 主→子 | 决策场景 | 读子模块文件 + 主系统模式/故事 |

**设计原则**：子模块管"事"，主系统管"我"。

---

## 文件模板

见 `templates/` 目录：
- `经历流水账.md` — 事件收件箱
- `模式与盲点.md` — 行为规律 + 盲区地图
- `我的故事.md` — 人生叙事主库

## 项目结构

```
your-world-editor/
├── SKILL.md                       ← 主系统入口（本文件）
├── models.py                      ← Event / Pattern / Decision 数据模型
├── CLAUDE.md / AGENTS.md          ← 多平台入口
├── .cursorrules                   ← Cursor 规则
├── scripts/
│   ├── corpus/
│   │   ├── store.py               ← 读写/搜索/同步
│   │   ├── event_intake.py        ← 智能事件接入（记录层）
│   │   └── pattern_cluster.py     ← 主题聚类+周期检测+盲区趋势（洞察层）
│   └── eval/
│       └── metrics.py             ← 系统使用/盲区改善/叙事沉淀 三维评估
├── sub-skills/
│   ├── life-jobhunt/SKILL.md      ← 求职模块
│   ├── life-money/SKILL.md        ← 财务模块
│   ├── life-health/SKILL.md       ← 健康模块
│   ├── life-love/SKILL.md         ← 爱情模块
│   └── life-dream/SKILL.md        ← 梦境模块
└── templates/                     ← 用户文件空模板
```

---

## 隐私

- 所有文件在用户本地，用户完全控制
- 敏感人物用代号（M / J / 朋友A）
- 不想系统看到的内容，不记进系统
- 这是"看见模式"的工具，不是"逐字真相"的存档
