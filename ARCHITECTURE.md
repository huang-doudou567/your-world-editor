# 你的世界编辑器 · 架构设计

---

## 1. 核心设计

### 1.1 三层解耦

```
记录层（降低摩擦）  →  检索层（对抗遗忘）  →  洞察层（跨越碎片）
event_intake.py        store.search_entries()   pattern_cluster.py
```

每一层解决一个独立的技术问题，可独立测试、独立迭代。

### 1.2 数据模型标准化

```python
Event（事件）→ Pattern（模式）→ Decision（决策）
```

| 模型 | 核心字段 | 实现 |
|------|---------|------|
| Event | tag / text / source / timestamp / pattern_refs[] / confidence / grounded / merged | `models.py` |
| Pattern | name / type(positive\|blind_spot) / trigger / cases[] / bookquotes[] / confidence | `models.py` |
| Decision | context / choice / framework_used / framework_applied / blind_spot_scan / review_date | `models.py` |

每个模型都有 `confidence` 字段用于置信度标记，`grounded` / `framework_applied` 用于防幻觉。

### 1.3 模块职责

| 模块 | 文件 | 职责 | 确定性 |
|------|------|------|--------|
| 数据模型 | `models.py` | Event/Pattern/Decision/WeeklyReview 结构化定义 | ✅ 纯 dataclass |
| 存储层 | `scripts/corpus/store.py` | Markdown 读写、事件追加、模式同步、加权搜索 | ✅ 纯 Python I/O |
| 事件接入 | `scripts/corpus/event_intake.py` | 信号打分、标签推测、自动记录判定 | ✅ 纯 Python 逻辑 |
| 模式聚类 | `scripts/corpus/pattern_cluster.py` | 主题聚类、周期检测、盲区趋势追踪 | ✅ 纯 Python 统计 |
| 评估 | `scripts/eval/metrics.py` | 系统健康度/盲区改善度/叙事沉淀率评分 | ✅ 纯 Python 计算 |
| Agent 编排 | `SKILL.md` | 场景路由、语义理解、洞察表达、7 步引导 | Agent 推理 |

**分工原则**：Agent 做推理判断（这条事件是不是盲区再现、怎么表达洞察、merge 到哪个章节），Python 脚本做确定性脏活（打分、搜索、聚类、统计、文件读写）。两者通过 Markdown 文件和函数返回值解耦。

### 1.4 降级处理

| 场景 | 降级策略 |
|------|---------|
| Python 环境不可用 | Agent 退回到纯 SKILL.md 指导模式，只用文本匹配 |
| 模式库为空 | 只记流水账，不匹配模式 |
| 判断框架未建立 | `framework_applied: false`，引导建立 |
| 书摘库为空 | 不附书摘 |
| 数据 < 10 条 | 评估标注"数据不足" |

---

## 2. 文件存储方案

```
项目空间 /人生系统/
├── 事件/
│   └── 经历流水账.md
├── 模式/
│   └── 模式与盲点.md
├── 叙事/
│   └── 我的故事.md
├── 求职/
├── 财务/
├── 健康/
├── 梦境/
└── 复盘/
```

---

## 3. 模块间数据流

```
用户自然语言输入
    │
    ▼
┌─────────────────────────────────────┐
│          event_intake.py             │
│  assess_record_worthiness(text)      │
│  → {score, tag, mode, title}        │
└──────────────┬──────────────────────┘
               │ score ≥ 8 → 自动写入
               │ score 4-7 → Agent 确认
               ▼
┌─────────────────────────────────────┐
│            store.py                  │
│  append_journal_entry()             │
│  sync_pattern_case()                │
│  merge_to_story()                   │
│  search_entries(query)              │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 流水账    模式与盲点   我的故事
    │          │          │
    └──────────┼──────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       pattern_cluster.py             │
│  generate_insights(system_dir)      │
│  → 主题聚类 / 周期检测 / 盲区趋势    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         metrics.py                   │
│  generate_eval_report(system_dir)   │
│  → 健康度 / 改善度 / 沉淀率          │
└─────────────────────────────────────┘
```

---

## 4. 完整文件结构

```
your-world-editor/
├── SKILL.md                       ← 主系统入口
├── models.py                      ← 数据模型
├── README.md                      ← 项目说明
├── ARCHITECTURE.md                ← 本文件
├── CLAUDE.md                      ← Claude Code 入口
├── AGENTS.md                      ← Codex 入口
├── .cursorrules                   ← Cursor 规则
├── scripts/
│   ├── corpus/
│   │   ├── store.py               ← 存储层
│   │   ├── event_intake.py        ← 记录层
│   │   └── pattern_cluster.py     ← 洞察层
│   └── eval/
│       └── metrics.py             ← 评估层
├── sub-skills/
│   ├── life-jobhunt/SKILL.md
│   ├── life-money/SKILL.md
│   ├── life-health/SKILL.md
│   ├── life-love/SKILL.md
│   └── life-dream/SKILL.md
└── templates/
    ├── 经历流水账.md
    ├── 模式与盲点.md
    └── 我的故事.md
```

---

## 5. 设计亮点

| 维度 | 设计 |
|------|------|
| 架构 | 记录层→检索层→洞察层 三层独立解耦 |
| 数据模型 | 显式 Event/Pattern/Decision 结构，confidence + grounded 防幻觉 |
| 分工 | Agent 做推理判断，Python 做确定性执行，函数返回值解耦 |
| 降级 | 每层独立降级，数据缺失时标记而非打断 |
| 评估 | 三维指标闭环：健康度/改善度/沉淀率 |
| 多端 | Claude Code / Codex / Cursor 三个入口均适配 |
