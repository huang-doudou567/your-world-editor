# 你的世界编辑器 · 架构设计

---

## 1. 核心设计

### 1.1 六层解耦（v2.1）

```
记录层（降低摩擦） → 检索层（对抗遗忘） → 洞察层（跨越碎片） → 推演层（向前看） → 情绪层（情感维度） → 分析层（标签分类）
```

每一层解决一个独立的技术问题，可独立测试、独立迭代。

### 1.2 数据模型标准化

```
Event（事件）→ Pattern（模式）→ Decision（决策）→ DecisionAnswer（推演记录）
```

| 模型 | 核心字段 | 实现 |
|------|---------|------|
| Event | tag / text / source / timestamp / emotion / patternRefs[] / confidence / grounded / merged | `web/src/engine/types.ts` + `models.py` |
| Pattern | name / type(positive\|blind_spot) / trigger / core / countermeasure / cases[] / bookquotes[] / confidence | `web/src/engine/types.ts` + `models.py` |
| Decision | context / choice / framework_used / framework_applied / blind_spot_scan / review_date | `models.py` |
| DecisionAnswer | pathKey / pathTitle / prompt / answer / timestamp | `web/src/data/db.ts` |
| TagFramework | tag / title / description / keyQuestions[] / patternTypes[] | `web/src/engine/tag-frameworks.ts` |

每个模型都有 `confidence` 字段用于置信度标记，`grounded` / `framework_applied` 用于防幻觉。

### 1.3 模块职责

#### Web 版模块

| 模块 | 文件 | 职责 | 确定性 |
|------|------|------|--------|
| AI 对话 | `chat/api-client.ts` | 直连 DeepSeek API，SSE 流式解析 | ✅ 纯 HTTP |
| AI 对话 | `chat/system-prompt.ts` | 精简系统提示词（~300 chars），"先回应后记录"准则 | ✅ 纯文本 |
| 上下文组装 | `chat/context-builder.ts` | 用户数据注入 API 请求体 | ✅ 纯函数 |
| 信号打分 | `engine/event-intake.ts` | 150+ 关键词打分、标签推测、情绪分类、10 场景路由 | ✅ 纯函数 |
| 搜索统计 | `engine/store.ts` | 加权搜索、getSystemStats（三维评分 + 情绪分布）| ✅ 纯函数 |
| 数据模型 | `engine/types.ts` | Event / Pattern / Decision / SystemStats 类型定义 | ✅ 纯类型 |
| 分析框架 | `engine/tag-frameworks.ts` | 8 个标签分析框架定义（纯配置）| ✅ 纯配置 |
| 数据持久化 | `data/db.ts` | localStorage CRUD（journal/patterns/story/decisions/decision_answers）| ✅ 纯 I/O |
| 状态管理 | `stores/*-store.ts` | Zustand 5 个独立 store（journal/pattern/story/ui/chat）| ✅ 纯状态 |
| 服务端 (可选) | `server/index.ts` | Express 代理 DeepSeek API（CORS + SSE）| ✅ 纯服务 |

#### CLI 版模块

| 模块 | 文件 | 职责 | 确定性 |
|------|------|------|--------|
| 数据模型 | `models.py` | Event/Pattern/Decision/WeeklyReview 结构化定义 | ✅ 纯 dataclass |
| 存储层 | `scripts/corpus/store.py` | Markdown 读写、事件追加、模式同步、加权搜索 | ✅ 纯 Python I/O |
| 事件接入 | `scripts/corpus/event_intake.py` | 信号打分、标签推测、自动记录判定 | ✅ 纯 Python 逻辑 |
| 模式聚类 | `scripts/corpus/pattern_cluster.py` | 主题聚类、周期检测、盲区趋势追踪 | ✅ 纯 Python 统计 |
| 评估 | `scripts/eval/metrics.py` | 系统健康度/盲区改善度/叙事沉淀率评分 | ✅ 纯 Python 计算 |
| Agent 编排 | `SKILL.md` | 场景路由、语义理解、洞察表达、7 步引导 | Agent 推理 |

**分工原则**：Agent 做推理判断（这条事件是不是盲区再现、怎么表达洞察、merge 到哪个章节），Python 做确定性脏活（打分、搜索、聚类、统计、文件读写）。Web 版前端直连 DeepSeek API，去掉了中间服务层。

---

## 2. 文件存储方案

### Web 版

所有数据存在浏览器 `localStorage`：
- `ywe_journal` — 事件列表（Event[]）
- `ywe_patterns` — 模式列表（Pattern[]）
- `ywe_story` — 叙事层（StorySection[]）
- `ywe_decisions` — 决策记录（Decision[]）
- `ywe_decision_answers` — 决策推演记录（DecisionAnswerItem[]）
- `ywe_ds_key` — DeepSeek API Key（可覆盖内置默认 Key）

### CLI 版

```
项目空间 /人生系统/
├── 事件/经历流水账.md
├── 模式/模式与盲点.md
├── 叙事/我的故事.md
├── 求职/ 财务/ 健康/ 梦境/
└── 复盘/
```

---

## 3. Web 版模块间数据流

```
用户自然语言输入
    │
    ▼
┌─────────────────────────────────────┐
│       event-intake.ts                │
│  assessRecordWorthiness(text)        │
│  detectSceneIntent(text)             │
│  classifyEmotion(text)               │
│  → {score, tag, emotion, mode}      │
└──────────────┬──────────────────────┘
               │ score ≥ 4 → 自动写入
               ▼
┌─────────────────────────────────────┐
│          chat-store.ts               │
│  构建上下文消息                       │
│  调用 api-client.ts                  │
└──────────────┬──────────────────────┘
               │ POST
               ▼
┌─────────────────────────────────────┐
│       api.deepseek.com/v1            │
│  chat/completions (SSE streaming)    │
│  system-prompt.ts 作为 system 消息    │
│  context-builder.ts 数据注入          │
└──────────────┬──────────────────────┘
               │ SSE 流式响应
               ▼
┌─────────────────────────────────────┐
│         ChatView.tsx                 │
│  流式渲染 + 思考过程折叠              │
│  解析 [建议记录: ...] 标记            │
│  引用回复 + 手动记录按钮              │
└──────────────┬──────────────────────┘
               │ 触发同步
               ▼
┌─────────────────────────────────────┐
│           db.ts                      │
│  saveEntry() → localStorage          │
│  saveDecisionAnswer() → localStorage │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────────────┐
    ▼          ▼                  ▼
  流水账    看板 + 分析面板      决策推演
(journal) (dashboard/analysis) (decisionSim)
```

### 分析面板数据流（v2.1 新增）

```
entries (Event[])  +  patterns (Pattern[])  +  decisionAnswers (DecisionAnswerItem[])
    │
    ▼
TagAnalysisPanel.tsx
    ├── 按 e.tag 分组（排除 ''）
    ├── 查 TAG_FRAMEWORK_MAP[tag] → 框架定义
    ├── 逐标签计算：
    │   ├── emotionDist（情绪分布）
    │   ├── linkedPatterns（关联模式 → patternRefs）
    │   ├── autoInsights（计数/趋势/盲区比例）
    │   └── decisionInsights（仅决策标签：路径分布）
    └── 渲染 2 列响应式网格卡片
```

---

## 4. 视图路由

```
App.tsx renderView() switch(view):
  chat       → ChatView.tsx        （Default 路由）
  dashboard  → Dashboard.tsx
  analysis   → TagAnalysisPanel.tsx （v2.1 新增）
  journal    → JournalList.tsx
  recall     → RecallTimeline.tsx
  patterns   → PatternList.tsx
  story      → StoryView.tsx
  simulate   → DecisionSim.tsx
  onboarding → OnboardingWizard.tsx
  guide      → UserGuide.tsx
```

侧边栏 `Sidebar.tsx` 驱动所有导航，`ui-store.ts` 管理当前视图状态。

---

## 5. 完整文件结构

```
your-world-editor/
├── README.md                          ← 项目说明（含快速开始 + 版本历史）
├── ARCHITECTURE.md                    ← 本文件
├── SKILL.md                           ← 主系统入口（Claude Code / Codex）
├── models.py                          ← Python 数据模型
├── CLAUDE.md / AGENTS.md / .cursorrules  ← 多平台 AI 入口
├── render.yaml                        ← Render 部署配置
├── scripts/
│   ├── corpus/
│   │   ├── store.py                   ← 存储层（Markdown I/O）
│   │   ├── event_intake.py            ← 记录层（信号打分）
│   │   └── pattern_cluster.py         ← 洞察层（聚类/周期）
│   └── eval/
│       └── metrics.py                 ← 评估层（三维指标）
├── web/                               ← React Web 应用
│   ├── src/
│   │   ├── App.tsx                    ← 主路由（10 view modes）
│   │   ├── components/
│   │   │   ├── ChatView.tsx           ← AI 对话页（流式 + 引用回复）
│   │   │   ├── Dashboard.tsx          ← 数据看板（评分卡 + 饼图）
│   │   │   ├── TagAnalysisPanel.tsx   ← 标签分类分析（8 framework cards）
│   │   │   ├── JournalList.tsx        ← 流水账列表（编辑/删除）
│   │   │   ├── PatternList.tsx        ← 模式与盲点
│   │   │   ├── StoryView.tsx          ← 我的故事（编辑/保存）
│   │   │   ├── DecisionSim.tsx        ← 决策推演（localStorage 持久化）
│   │   │   ├── RecallTimeline.tsx     ← 回忆时间线（月分组+筛选）
│   │   │   ├── EmotionBar.tsx         ← 情绪窗格指示器（compact + full）
│   │   │   ├── Sidebar.tsx            ← 侧边栏导航（含情绪指示器）
│   │   │   ├── OnboardingWizard.tsx   ← 7 步引导流程
│   │   │   └── UserGuide.tsx          ← 使用指南（含版本历史）
│   │   ├── chat/
│   │   │   ├── api-client.ts          ← DeepSeek API 直连（SSE stream）
│   │   │   ├── system-prompt.ts       ← 精简提示词（先回应，后记录）
│   │   │   └── context-builder.ts     ← 用户数据上下文组装
│   │   ├── engine/
│   │   │   ├── types.ts               ← Event/Pattern/Decision 类型
│   │   │   ├── store.ts               ← 搜索 + getSystemStats
│   │   │   ├── event-intake.ts        ← 150+ 关键词 + 10 场景路由
│   │   │   └── tag-frameworks.ts      ← 8 个标签分析框架定义
│   │   ├── stores/
│   │   │   ├── journal-store.ts       ← 事件状态
│   │   │   ├── pattern-store.ts       ← 模式状态
│   │   │   ├── story-store.ts         ← 叙事状态
│   │   │   ├── ui-store.ts            ← UI 视图状态
│   │   │   └── chat-store.ts          ← 对话状态
│   │   └── data/
│   │       ├── db.ts                  ← localStorage CRUD + DecisionAnswer
│   │       └── seed.ts                ← 预设演示数据
│   ├── server/
│   │   └── index.ts                   ← Express 服务端（可选 Render 部署）
│   ├── vite.config.ts
│   └── package.json
├── sub-skills/                        ← 求职/财务/健康/爱情/梦境
├── templates/                         ← 用户文件空模板
└── 人生系统/                          ← CLI 版数据目录
```

---

## 6. 设计亮点

| 维度 | 设计 |
|------|------|
| 架构 | 六层独立解耦：记录→检索→洞察→推演→情绪→分析 |
| 数据模型 | 显式 Event/Pattern/Decision/DecisionAnswer 结构，confidence + grounded 防幻觉 |
| AI 接入 | 前端直连 DeepSeek API（SSE 流式），无中间服务器，零延迟 |
| 分工 | Agent 做推理判断，确定性函数做脏活，函数返回值解耦 |
| 降级 | 每层独立降级，数据缺失时标记而非打断 |
| 评估 | 三维指标闭环：健康度/改善度/沉淀率 |
| 分析 | 8 个标签分析框架，自动洞察生成，决策推演数据联动 |
| 多端 | Web Demo / Claude Code / Codex / Cursor 四个入口均适配 |
| 隐私 | Web 版全数据 localStorage 本地存储，CLI 版纯 Markdown 文件 |
| 持久化 | 决策推演答案自动保存到 localStorage，刷新不丢失 |
