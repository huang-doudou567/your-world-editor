# 你的世界编辑器

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/huang-doudou567/your-world-editor)

> 一个 AI 驱动的自我认知操作系统
>
> 记录层降低摩擦 · 检索层对抗遗忘 · 洞察层跨越碎片 · 推演层向前看 · 情绪层增加情感维度

---

## 🚀 快速体验

**网页版 Demo：https://huang-doudou567.github.io/your-world-editor/**

零安装、零注册、打开即用。直连 DeepSeek 真实 AI，支持流式对话。所有数据存本地浏览器，完全隐私。

---

## 解决什么问题

人的自我认知依赖记忆，但记忆是衰减的、碎片的、情绪偏差的。三个月前为什么做了那个决定，当时怎么想的，这已经是第几次了——说不清楚。这个信息不对称导致：做决策时调用不了完整信息源；反复踩同一个坑而不自知。同时，人在面临重大选择时缺少"向前看"的工具——迷茫时不知道该往哪走，恐惧时不知道选了会不会很糟。

## 怎么解决

把"人生认知"拆成五个独立的技术问题：

| 层 | 模块 | 做什么 | Web 版实现 | CLI 版实现 |
|---|---|---|---|---|
| **记录层** | 智能事件接入 | 自动判断什么值得记，标注标签与情绪窗格 | `event-intake.ts` 150+ 关键词 + 10 场景路由 | `scripts/corpus/event_intake.py` |
| **情绪层** | 语义情感分类 | 每条事件自动分类到 🎨彩色 / 💡明亮 / 🌑黑暗 | LLM 语义判断 + 关键词 fallback → `emotion` 字段 | Agent 语义判断 → `emotion` 字段 |
| **检索层** | 多维度加权搜索 | 模糊记忆也能捞回来 | 关键词 + 标签 + 近期加权排序 | `scripts/corpus/store.py` |
| **洞察层** | 标签分类分析 | 8 个分析框架按标签维度深度分析行为模式 | `TagAnalysisPanel.tsx` 自动洞察生成 | `scripts/corpus/pattern_cluster.py` |
| **推演层** | 人生路径推演 + 决策持久化 | 同时推演三条路径，数据自动保存 | `DecisionSim.tsx` localStorage 持久化 | `人生系统/决策推演/` |

五层之上有评估指标闭环：系统健康度 / 盲区改善度 / 叙事沉淀率。

### 第八个分析维度：标签分类分析（v2.1 新增）

在情绪窗格三维分类之外，按事件标签做独立分析：

| 标签 | 分析框架 | 聚焦 |
|------|---------|------|
| 💼 工作事业 | 职业定位 | 厘清优势与盲区，识别职业模式 |
| ❤️ 感情 | 择偶定位 | 复盘关系模式，发现真实需求 |
| 🏥 健康 | 健康画像 | 身体规律、压力触发、自愈习惯 |
| 💰 财务 | 财务行为模式 | 收支习惯、风险偏好、金钱信念 |
| 🎯 决策 | 决策风格分析 | 决策逻辑、常见陷阱、框架使用率 |
| 🔄 模式 | 行为模式洞察 | 反复循环、触发-反应链路 |
| 💡 洞察 | 认知成长轨迹 | 顿悟时刻、认知转变、学习曲线 |
| 🌙 梦境 | 梦境主题分析 | 反复梦境主题、情绪底色 |

## Web 版功能

| 页面 | 侧边栏入口 | 功能 |
|------|----------|------|
| 💬 对话 | 对话 | DeepSeek 流式 AI 对话，150+ 触发词自动路由，引用回复按钮 |
| 📊 数据看板 | 看板 | 三维评分卡 + 情绪窗格饼图 + EmotionBar + 系统概览 |
| 📊 标签分类分析 | 分析 | 8 个标签分析卡片，自动洞察 + 关联模式 + 决策推演数据 |
| 📝 流水账 | 流水账 | 全事件倒序列表，支持编辑/删除/标签修改/情绪窗格调整 |
| ⏳ 回忆 | 回忆 | 按月分组时间线，情绪窗格筛选，关键词搜索 |
| 📡 模式 | 模式 | 盲区模式 + 正向模式，触发条件 + 对策 + 案例日志 |
| 📚 我的故事 | 我的故事 | 叙事层主库：判断框架、金句、短诗，支持在线编辑 |
| 🧭 决策推演 | 决策推演 | 三条路径推演，数据自动保存到本地，刷新不丢失 |

## 多平台支持

| 平台 | 入口文件 | 使用方式 |
|------|---------|---------|
| **Web Demo** | GitHub Pages | 浏览器打开即用，直连 DeepSeek AI |
| **Claude Code** | `CLAUDE.md` + `SKILL.md` | 放到项目目录，Claude Code 自动读取 |
| **Codex** | `AGENTS.md` + `SKILL.md` | 放到项目目录，Codex 自动读取 |
| **Cursor** | `.cursorrules` | 放到项目目录，Cursor 自动加载 |

## 快速开始

### Web 版
1. 打开 https://huang-doudou567.github.io/your-world-editor/
2. 内置 DeepSeek Key，打开即可对话
3. 如需自己的 Key：点右上角「未设Key」→ 输入 sk- 开头的 Key → 保存

### CLI 版

跟 AI 说：「搭建」「启动」「初始化」

引导流程：起昵称 → 选文件位置 → 建核心文件 → 投喂初始资料 → 书摘联动 → 试一句流水账 → 收尾

## 日常使用

说话就行，不用记命令。

- 📝 记流水账：「记一下」「今天」「刚刚」「记录」—— AI 自动判断记录价值
- 🔍 检索回忆：「上次跟XX那次」「搜一下」「找一下」
- 🪞 周复盘：「照镜子」「周复盘」「这周怎么样」
- 🎨 情绪统计：「我这周住在哪个窗格」「情绪怎么样」
- 🧭 决策推演：「推演一下」「三条路」「帮我分析要不要」—— 数据自动保存
- 💡 洞察记录：「我意识到」「想通了」「终于明白」
- 🌙 记梦：「做了个梦」「梦到」「记梦」
- 📚 收藏金句：「收藏」「记一句」「座右铭」
- 📊 看标签分析：侧边栏「分析」—— 按标签维度深度分析
- 🔄 识别模式：「又开始了」「又踩坑了」「老毛病」
- 📚 沉淀叙事：「Merge 一下」「整理一下」
- 📊 系统评估：「系统评估」「效果怎么样」

## 项目结构

```
your-world-editor/
├── README.md                          ← 本文件
├── SKILL.md                           ← 主系统入口（Claude Code / Codex）
├── models.py                          ← Python 数据模型
├── CLAUDE.md / AGENTS.md / .cursorrules  ← 多平台 AI 入口
├── render.yaml                        ← Render 部署配置
├── scripts/
│   ├── corpus/
│   │   ├── store.py                   ← 读写/搜索/同步（检索层）
│   │   ├── event_intake.py            ← 智能事件接入（记录层）
│   │   └── pattern_cluster.py         ← 聚类/周期/趋势（洞察层）
│   └── eval/
│       └── metrics.py                 ← 三维评估指标
├── web/                               ← React Web 应用
│   ├── src/
│   │   ├── App.tsx                    ← 主路由（10 个视图）
│   │   ├── components/
│   │   │   ├── ChatView.tsx           ← AI 对话页（流式 + 引用回复）
│   │   │   ├── Dashboard.tsx          ← 数据看板（评分卡 + 饼图）
│   │   │   ├── TagAnalysisPanel.tsx   ← 标签分类分析（8 个框架）
│   │   │   ├── JournalList.tsx        ← 流水账列表
│   │   │   ├── PatternList.tsx        ← 模式与盲点
│   │   │   ├── StoryView.tsx          ← 我的故事
│   │   │   ├── DecisionSim.tsx        ← 决策推演（localStorage 持久化）
│   │   │   ├── RecallTimeline.tsx     ← 回忆时间线
│   │   │   ├── EmotionBar.tsx         ← 情绪窗格指示器
│   │   │   ├── Sidebar.tsx            ← 侧边栏导航
│   │   │   ├── OnboardingWizard.tsx   ← 7 步引导
│   │   │   └── UserGuide.tsx          ← 使用指南（含版本历史）
│   │   ├── chat/
│   │   │   ├── api-client.ts          ← DeepSeek API 直连（SSE 流式）
│   │   │   ├── system-prompt.ts       ← 精简系统提示词（先回应，后记录）
│   │   │   └── context-builder.ts     ← 用户数据上下文组装
│   │   ├── engine/
│   │   │   ├── types.ts               ← Event / Pattern / Decision 类型
│   │   │   ├── store.ts               ← 搜索 + 统计（getSystemStats）
│   │   │   ├── event-intake.ts        ← 信号打分 + 情绪分类 + 场景路由
│   │   │   └── tag-frameworks.ts      ← 8 个标签分析框架定义
│   │   ├── stores/                    ← Zustand 状态管理（5 个 store）
│   │   └── data/
│   │       ├── db.ts                  ← localStorage CRUD + 决策数据持久化
│   │       └── seed.ts                ← 预设演示数据
│   ├── server/
│   │   └── index.ts                   ← Express 服务端（可选：Render 部署）
│   └── vite.config.ts
├── sub-skills/                        ← 求职/财务/健康/爱情/梦境
├── templates/                         ← 用户文件空模板
└── 人生系统/                          ← CLI 版数据目录
    ├── 事件/经历流水账.md
    ├── 模式/模式与盲点.md
    ├── 叙事/我的故事.md
    └── 决策推演/
```

## 版本历史

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| **v2.1** | 2026-07-15 | 标签分类分析面板（8 框架）、决策推演数据持久化、使用指南全面更新 |
| **v2.0** | 2026-07-03 | 记录自动同步流水账（阈值 4）、触发词 150+（10 场景路由）、EmotionBar（侧边栏+对话页）、引用回复按钮 |
| **v1.9** | 2026-06-30 | 修复 AI 对话上下文丢失、精简 system prompt 减少幻觉、"先回应后记录"准则 |
| **v1.8** | 2026-06-30 | 集成 DeepSeek API SSE 流式对话，替代旧关键词引擎 |
| **v1.7** | 2026-06-26 | React Web 应用上线：对话/看板/流水账/模式/故事/推演/引导 7 页面 |
| **v1.5** | 2026-06-24 | 决策推演模块 + 情绪窗格三分类 |
| **v1.0** | 2026-06-20 | 初版：三层 AI 自我认知系统（Python + Markdown） |

## 隐私

Web 版：所有数据存浏览器 localStorage，不上传服务器。AI 对话直连 DeepSeek API，无中间服务器。CLI 版：纯 Markdown 本地文件。敏感人物用代号。

## License

MIT
