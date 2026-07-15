// 生成产品项目介绍文档 Word 文档
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber } from 'docx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NAVY = '0F1829'; const CREAM = 'FCF5DB'; const GOLD = 'F0E0AA';
const MUTED = '5B6575'; const SOFT_BLUE = 'E1F3FF';

const title = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, spacing: { before: 360, after: 180 }, children: [new TextRun({ text, font: 'Noto Serif SC', color: NAVY, bold: true })] });
const h2 = (text) => title(text, HeadingLevel.HEADING_2);
const h3 = (text) => title(text, HeadingLevel.HEADING_3);
const body = (text) => new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, font: 'Noto Sans SC', size: 21, color: NAVY })] });
const muted = (text) => new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text, font: 'Noto Sans SC', size: 18, color: MUTED, italics: true })] });
const bullet = (text, level = 0) => new Paragraph({ spacing: { before: 30, after: 30 }, bullet: { level }, children: [new TextRun({ text, font: 'Noto Sans SC', size: 20, color: NAVY })] });
const divider = () => new Paragraph({ spacing: { before: 120, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 1 } }, children: [] });

const hcell = (text, w) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: NAVY }, children: [new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text, font: 'Noto Sans SC', size: 18, color: CREAM, bold: true })] })] });
const cell = (text, w) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text, font: 'Noto Sans SC', size: 18, color: NAVY })] })] });
const row = (cells) => new TableRow({ children: cells });

const table = (headers, data) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(headers.map((h, i) => hcell(h, i === 0 ? 15 : i === 1 ? 35 : 50))), ...data.map(d => row(d.map((c, j) => cell(c, j === 0 ? 15 : j === 1 ? 35 : 50))))] });

const CHILDREN = [];

// ═══════ 封面 ═══════
CHILDREN.push(
  new Paragraph({ spacing: { before: 2000 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: '你的世界编辑器', font: 'Noto Serif SC', size: 72, color: NAVY, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'AI 产品项目介绍文档', font: 'Noto Serif SC', size: 48, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: '投递岗位：AI 产品经理', font: 'Noto Sans SC', size: 24, color: MUTED, italics: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 40 }, children: [new TextRun({ text: '2026 年 7 月', font: 'Noto Sans SC', size: 22, color: MUTED })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'github.com/huang-doudou567/your-world-editor', font: 'IBM Plex Mono', size: 18, color: MUTED })] }),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 一、产品概述 ═══════
CHILDREN.push(
  h2('一、产品概述'),
  h3('1.1 一句话定位'),
  body('"你的世界编辑器"是一套 AI 驱动的自我认知操作系统——将人生碎片自动转化为结构化洞察与推演路径。'),
  h3('1.2 产品形态'),
  body('Web Demo（SPA 网页版）+ CLI 客户端（Claude Code / Codex / Cursor），支持多端使用。Web 版直连 DeepSeek 真实 AI 模型，支持流式对话；CLI 版基于本地 Markdown 文件系统与 Python 脚本做深层聚类分析。'),
  h3('1.3 核心数据'),
  bullet('开发周期：2026.06.20 — 2026.07.15（25 天，27 次提交）'),
  bullet('技术栈：React 19 + TypeScript + Vite + Zustand + Tailwind CSS 4 + DeepSeek API + Vercel Serverless'),
  bullet('演示地址：https://huang-doudou567.github.io/your-world-editor/'),
  bullet('开源协议：MIT · GitHub Stars 增长中'),
  bullet('代码规模：Web 前端 12 个组件、5 个 Zustand Store、4 个引擎模块；CLI 5 个 Python 脚本'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 二、需求拆解 ═══════
CHILDREN.push(
  h2('二、需求拆解'),
  h3('2.1 用户画像与场景'),
  body('目标用户：正处于人生决策密集期的知识工作者（22-35 岁）。典型场景包括——面临职业选择（换工作/转型/创业）、需要梳理个人关系模式（情感/家庭/社交）、希望建立系统化自我认知习惯、频繁陷入同类困境但缺乏外部"雷达"。'),
  body('他们的核心痛点是"信息不对称"——决策时调用不了完整信息源，因为记忆已经衰减；反复踩同一个坑而不自知，因为上一次的痛已经模糊；在迷茫时缺少"向前看"的结构化工具。'),
  h3('2.2 痛点拆解'),
  table(['#', '痛点', '本质'], [
    ['1', '记忆衰减', '三个月前的决策逻辑从记忆中模糊，决策时信息源不完整'],
    ['2', '行为盲区', '反复陷入同一类困境而不自知，缺乏外部分析工具'],
    ['3', '碎片化', '日常记录散落各处，无法关联形成认知升级'],
    ['4', '缺少推演', '迷茫时靠直觉选，没有结构化对比不同路径的工具'],
  ]),
  h3('2.3 需求优先级拆解（MoSCoW）'),
  table(['优先级', '需求', '说明'],
    [
      ['P0-Must', 'AI 对话 + 智能记录', '核心价值闭环：用户说话 → AI 理解 → 自动归档'],
      ['P0-Must', '数据持久化', '对话、事件、决策数据全部本地持久化，刷新不丢失'],
      ['P1-Should', '情绪窗格 + 看板', '让用户"看见自己"：情绪分布、系统健康度、盲区趋势'],
      ['P1-Should', '标签分类分析', '8 个分析框架按标签维度深度分析（v2.1）'],
      ['P2-Could', '决策推演 + 持久化', '三路径推演，数据自动保存并回流分析面板'],
      ['P3-Wont', '多端部署', 'Vercel 后端 API + GitHub Pages 前端，无需服务器运维'],
    ]),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 三、产品故事 ═══════
CHILDREN.push(
  h2('三、产品故事'),
  h3('3.1 为什么做这个产品'),
  body('2026 年 6 月，我刚经历了一个密集决策期——同时拒绝了多份 offer、面临职业方向选择、需要梳理个人关系模式。我发现自己反复在同一个问题上纠结，但已经想不起来三个月前是怎么想的、当时做了什么样的分析。'),
  body('我发现这不是"记性不好"的问题，而是一个系统性的数据断层：人的大脑天然不擅长长期存储决策上下文和行为日志。市面上有日记 App、有冥想 App、有番茄钟——但没有一个产品能同时解决"记录摩擦→记忆衰减→碎片化→缺少推演"这四层递进需求。'),
  body('于是我决定自己做。不为了做大，而是为了解决真实的一手痛点。'),
  h3('3.2 产品愿景'),
  body('从"AI 替你思考"到"AI 帮你看见你自己"。不是给你答案的机器人，而是一面镜子——照出你在哪个情绪窗格里住得太久、哪些模式在反复循环、每条人生路径走到尽头是什么样。最终所有决定由你自己做，AI 只帮你看见你正在回避的东西。'),
  h3('3.3 用户旅程'),
  body('小张（26 岁，产品运营）第一次打开 demo → 内置 Key 直接对话 → 说了句"记一下，今天又被 leader 压着不让我发言" → 系统自动打分 6 分，归入工作事业标签 + 黑暗窗格，同步写入流水账 → 第二天说"照镜子"，AI 基于两周记录做周复盘 → 切换到分析页，看到"职业定位"卡片显示她 3 次在"被暗示不够好"的模式里 → 切换到决策推演，三条路径分别填入思考 → 一周后，系统提醒有 3 条 7 天前的对话即将清理，她勾选了要保留的，其余删除。'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 四、功能设计 ═══════
CHILDREN.push(
  h2('四、功能设计'),
  h3('4.1 六层功能架构'),
  body('将"人生认知"拆解为六个独立可迭代的技术层，每层解决一个确定性问题：'),
  table(['层', '解决什么', '关键实现'],
    [
      ['记录层', '降低记录摩擦', '150+ 信号关键词打分 + 10 种场景意图路由，≥4 分自动写入流水账'],
      ['情绪层', '增加情感维度', 'LLM 语义判断 + 关键词 fallback → 🎨彩色/💡明亮/🌑黑暗三色窗格'],
      ['检索层', '对抗遗忘', '关键词+标签+近期加权多维度搜索，模糊记忆也能捞回来'],
      ['洞察层', '跨越碎片', 'patternRefs 关联 + 案例日志（❌/✅ 符号追踪），自动识别行为模式'],
      ['推演层', '向前看', '三条路径并行推演 + localStorage 持久化，数据回流分析面板'],
      ['分析层', '标签分类', '8 个分析框架自动洞察（职业定位/择偶定位/健康画像等）'],
    ]),
  h3('4.2 10 个视图（信息架构）'),
  body('侧边栏导航驱动所有视图切换，使用 Zustand ui-store 管理当前视图状态：'),
  table(['视图', '入口', '核心功能'],
    [
      ['💬 对话', '侧边栏第一项', 'DeepSeek SSE 流式 AI 对话 + 引用回复 + 选取文本引用为记录'],
      ['📊 数据看板', '侧边栏第二项', '三维评分卡 + 情绪饼图 + EmotionBar + 系统概览 + 最近记录'],
      ['📊 标签分析', '侧边栏第三项（v2.1 新增）', '8 个标签分析卡片，自动洞察 + 关联模式 + 决策推演数据联动'],
      ['📝 流水账', '侧边栏第四项', '全事件倒序列表，编辑/删除/标签修改/情绪窗格调整'],
      ['⏳ 回忆', '侧边栏第五项', '按月分组时间线，情绪窗格筛选，关键词搜索，点击卡片展开全文'],
      ['📡 模式', '侧边栏第六项', '盲区模式 + 正向模式，触发条件 + 对策 + 案例日志'],
      ['📚 我的故事', '侧边栏第七项', '叙事层主库：判断框架、金句库、短诗，在线编辑保存'],
      ['🧭 决策推演', '侧边栏第八项', '三路径推演，自动保存到 localStorage，刷新不丢失'],
    ]),
  h3('4.3 8 个标签分析框架（v2.1）'),
  body('在情绪窗格三维分类之外，按事件标签做独立分析维度。每个标签对应一个专属分析框架：'),
  table(['标签', '分析框架', '聚焦维度'],
    [
      ['💼 工作事业', '职业定位', '优势识别、盲区预警、职业决策模式'],
      ['❤️ 感情', '择偶定位', '关系模式复盘、真实需求提取'],
      ['🏥 健康', '健康画像', '压力触发点、自愈习惯识别'],
      ['💰 财务', '财务行为模式', '消费心理、风险偏好、金钱信念'],
      ['🎯 决策', '决策风格分析', '决策逻辑、常见陷阱、框架使用率'],
      ['🔄 模式', '行为模式洞察', '循环触发链路、突破案例追踪'],
      ['💡 洞察', '认知成长轨迹', '顿悟时刻、认知转变节点'],
      ['🌙 梦境', '梦境主题分析', '反复主题、情绪底色关联'],
    ]),
  h3('4.4 决策推演模块'),
  body('三条路径并行推演（当前深耕/转型迁移/理想路径），参考了斯坦福人生设计课的奥德赛计划。每条路径预设追问提示，用户填入思考后自动保存至 localStorage。推演数据作为独立信息源自动流入标签分析面板的"决策风格分析"卡片，与事件数据并列展示路径分布统计。'),
  h3('4.5 负面约束清单（Agent Safety）'),
  body('源自项目迭代中 10 条真实踩坑总结，编码在 system-prompt.ts 中作为 AI 行为的硬边界：'),
  bullet('1. 禁止静默记录——中置信度必须先获用户口头确认'),
  bullet('2. 禁止编造模式——模式提炼需 ≥3 条案例支撑'),
  bullet('3. 禁止替人决策——给结论但标注推理框架，输出可被用户推翻'),
  bullet('4. 禁止书摘硬贴——无贴切书摘就说"暂无"'),
  bullet('5. 禁止跳过降级告知——工具挂了明确声明'),
  bullet('6. 禁止 Merge 不汇报——每次展示"merge 了什么、放在哪"'),
  bullet('7. 禁止无视触发冲突——模糊时先问，不猜'),
  bullet('8. 禁止复盘给 to-do——只照镜子，不列待办'),
  bullet('9. 禁止单一推演——三条路都推演，结论用户自己下'),
  bullet('10. 禁止情绪评判——黑暗不是坏的，只能说"想聊聊吗"'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 五、界面介绍 ═══════
CHILDREN.push(
  h2('五、界面介绍'),
  h3('5.1 设计系统'),
  body('采用奶油色（#FCF5DB）+ 海军蓝（#0F1829）双主色调，搭配金色（#F0E0AA）强调和柔和蓝（#E1F3FF）辅助。Noto Serif SC（宋体风格）用于标题标识中文质感，Noto Sans SC 用于正文，IBM Plex Mono 用于技术标签和时间戳。'),
  h3('5.2 对话页（主交互界面）'),
  body('左侧深色侧边栏（240px 固定） + 右侧流体对话区（flex-1）。顶部显示对话页标题 + 情绪窗格快速指示按钮（如 🎨 彩色窗格 60%）+ 后端连接状态灯 + 新对话按钮。消息区用户消息深色气泡、AI 回复白色卡片，支持流式渲染和思考过程折叠。AI 消息 hover 显示"引用"和"引用为事件记录"按钮。底部可拖拽调节高度的输入区 + 轮播提示词。'),
  h3('5.3 数据看板'),
  body('顶部页眉栏 + 三张仪表卡（健康度/盲区改善度/叙事沉淀率）以 3 列网格展示，每张卡片包含大字评分 + 进度条。下方情绪窗格区域 1:2 并排扇区图 + EmotionBar 完整版进度条。再下方系统概览 6 个小统计卡片 + 最近 8 条记录列表。'),
  h3('5.4 标签分析面板'),
  body('2 列响应式网格，每张卡片包含：标签 emoji + 分析框架标题 + 记录数 badge、迷你情绪进度条（彩色/明亮/黑暗）、自动洞察列表（主导情绪占比/盲区比例/趋势/关联模式数量）、决策推演记录摘要（仅决策标签）、关联模式标签 cloud、最近 5 条事件行。空状态引导用户去流水账添加标签。'),
  h3('5.5 其他关键界面'),
  bullet('流水账页：倒序列表，每条可点击编辑（标题/正文/标签/情绪窗格/模式标记），支持删除'),
  bullet('回忆页：按月分组时间线（左边竖线 + 圆点），情绪筛选按钮 + 搜索框，点击卡片展开全文'),
  bullet('模式页：盲区模式（橘色警告）与正向模式（金色左边框强调），每个模式可展开案例日志'),
  bullet('决策推演页：3 个路径 tab 切换，预设追问 + 输入框，顶部显示已保存记录数 + 清空按钮'),
  bullet('使用指南页：可折叠的手风琴式 FAQ，9 个板块覆盖全部功能说明 + 版本历史'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 六、技术/体验亮点 ═══════
CHILDREN.push(
  h2('六、技术/体验亮点'),
  h3('6.1 架构决策亮点'),
  table(['决策点', '选择', '理由与收益'], [
    ['前后端分离架构', 'GitHub Pages（前端）+ Vercel Serverless（API）', '前端免费永不掉线，后端无需运维，API Key 存 Vercel 环境变量前端完全不可见'],
    ['直连 DeepSeek（v1.8→v2.0）', '前端内嵌 Key → 由暴露风险改 → Vercel 代理', '响应 GitHub 安全告警后 24 小时内完成架构切换，历史提交重写清理密钥'],
    ['SSE 流式通信', 'ReadableStream + AbortController', '支持停止生成、重试、心跳保活，用户体验接近 ChatGPT'],
    ['localStorage 全本地存储', '事件/模式/故事/决策/对话/Key 六类数据', '零服务器存储成本，完全隐私，刷新不丢失'],
    ['对话 7 天自动清理', '页面加载检测过期消息 → 弹窗逐条选择留存', '平衡存储压力与用户留存需求，而非粗暴一刀切'],
  ]),
  h3('6.2 体验亮点'),
  table(['亮点', '问题', '方案'], [
    ['触发词 150+（v2.0）', '用户说"I just started"就不会触发', '10 种场景路由，覆盖口语变体，语序无关'],
    ['EmotionBar 三层呈现', '颜色窗格"完全没有存在感"', '侧边栏常驻 + 对话页头部按钮 + 看板完整版，点击直达'],
    ['引用回复 + 文本选取引用', '对话无法回溯、无法复用为数据', 'hover 引用按钮 + 框选 AI 文本后弹出"引用为事件记录"浮层'],
    ['决策推演持久化', '用户说"刷新就没了"', '每条推演实时 localStorage 保存，显示保存计数，支持一键清空'],
    ['标签分析面板（v2.1）', '看板只有情绪维度，缺少标签维度', '8 个独立分析框架，自动计算洞察，数据与决策推演联动'],
  ]),
  h3('6.3 安全与隐私'),
  bullet('API Key 经历三次架构迭代：Render 需境外银行卡 → 前端直连 → 改用 Vercel 环境变量，最终实现密钥完全不可见'),
  bullet('所有用户数据存浏览器 localStorage，不传输至任何服务器（对话仅通过 HTTPS 加密发送至 DeepSeek API）'),
  bullet('git filter-branch + force push 彻底清除历史提交中的密钥残留'),
  h3('6.4 关键 Bug 修复记录（Lessons Learned）'),
  bullet('AI 答非所问：assistantMsg role 为 system 导致对话历史全被过滤，修复为 role: ai —— 数据流过滤条件要加单元测试'),
  bullet('LLM 幻觉严重：system prompt 2200 chars 含竞争性场景列表，精简至 300 chars 单一准则 —— prompt 越短越精准'),
  bullet('构建产物功能缺失：git stash 不保存未跟踪文件导致 EmotionBar.tsx 丢失 —— 部署前做功能点 grep 验证'),
  bullet('聊天刷新清零：messages 每次初始化为 [WELCOME_MESSAGE] —— 添加 localStorage 持久化 + 7 天清理'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 七、面试追问及回答完整稿 ═══════
CHILDREN.push(
  h2('七、面试追问及回答完整稿'),
  h3('Q1：为什么要做自我认知方向的产品？'),
  body('这是我的一手痛点。2026 年 6 月我同时面对多个职业选择，发现自己反复纠结却想不起三个月前的分析，也说不清这是第几次被同类问题卡住。市面上有日记 App、有冥想 App、有番茄钟——但没有产品打通"记录→检索→洞察→推演"这条链路。我做这个项目不是为做大，是为解决真实问题，它对我自己有用——这本身就是最强 PMF 验证。'),
  h3('Q2：你怎么定义 PMF（Product-Market Fit）？这个项目现在处于什么阶段？'),
  body('PMF = 产品解决了一个足够痛的问题，且用户愿意自发"再来一次"。这个项目当前处于 Pre-PMF 阶段——我自己是第 0 号用户且深度使用，功能设计来源于真实使用反馈。验证信号：迭代 27 次后系统健康度稳定上升、盲区覆盖从 2 个扩展到 8 个维度、体验从"能用"到"好用"。下一个阶段是找 10 个重度用户，用真实留存数据来量化 PMF。'),
  h3('Q3：为什么选择 Vercel Serverless 而不是传统的 Node.js 部署？'),
  body('"先上线，再优化"。最初尝试 Render（需境外银行卡），后改为前端直连（密钥暴露风险），最终用 Vercel 不到 1 天完成切换。Vercel 免费层 100GB 流量/月，零运维，国内可访问。关键考虑：API Key 安全（环境变量注入）> 成本（免费）> 性能（serverless 冷启动 < 2s）> 可维护性（无需 Docker/k8s）。'),
  h3('Q4：你是怎么拆解需求的？优先级依据是什么？'),
  body('用 MoSCoW 框架拆解：P0 Must = 核心价值闭环（AI 对话 + 智能记录 + 数据持久化）。P1 Should = 用户"看见自己"（情绪窗格 + 看板 + 标签分析）。P2 Could = 向前看（决策推演）。P3 Wont = 工程优化（部署架构、UI 打磨）。依据：先确保用户能"说一句话就被理解"，再确保能"看见数据"，最后才"推演未来"。砍掉的东西包括：移动 App、多人协作、AI 自动提醒——在 PMF 验证前不投入。'),
  h3('Q5：你如何处理 AI 幻觉？'),
  body('三层防护：第一层，system-prompt 精简至 300 chars，单一准则"先回应，后记录"，去掉竞争性指令。第二层，前端类型约束——AI 回复中提取 [建议记录: xxx] 标记，不符合格式的丢弃。第三层，负面约束清单 10 条反模式编码在 prompt 的"禁止做的事"段落中，Agent 每次调用前对照。效果：从 v1.8 频繁编造模式，到 v1.9 后误报率接近零。'),
  h3('Q6：你在 25 天内迭代 27 次，团队只有你一个人，怎么做到高效交付的？'),
  body('三个方法论：1)"一次性做对"不如"快速错一次"——v1.8→v1.9 的 AI 对话 bug 就是上线后用户反馈驱动的。2) 六层架构独立解耦——修改情绪层不影响记录层，修改分析层不影响对话层。3) Claude Code 作为开发加速器——能几小时完成从需求到部署的完整闭环。但 AI 只是工具，关键在于先有清晰的架构设计和需求拆解——不提前想清楚，AI 也帮不了你。'),
  h3('Q7：如果你加入我们团队做 AI 产品，你的第一个 30 天会怎么推进？'),
  body('Week 1——不写代码，和用户/业务方聊天、看数据后台、跑一遍现有产品的完整链路，写出三页纸的"当前产品状态分析报告"。Week 2——在现有产品基础上找最小的可量化优化点（可能是一个流程断点、一个 5% 转化率提升），不是重做而是"给现有产品打一个 AI 补丁"。Week 3——原型上线 + 内部用户小流量测试，拿真实数据。Week 4——基于数据复盘，产出一份"第一个月做了什么 + 学到了什么 + 下个月做什么"的报告。原则：先 deliver small wins，再谈 big vision。'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 八、迭代历程 ═══════
CHILDREN.push(
  h2('八、迭代历程'),
  table(['版本', '日期', '投递内容'], [
    ['v1.0–v1.5', '06.20–06.24', '需求定义 → CLI 三层原型 → 决策推演+情绪窗格 → 7 步引导'],
    ['v1.7', '06.26', 'Web 版上线：React SPA 全栈，GitHub Pages 部署'],
    ['v1.8', '06.30', '集成 DeepSeek API SSE 流式对话，替代旧模拟引擎'],
    ['v1.9', '06.30', '修复 AI 对话上下文丢失 + 精简 system prompt 减少幻觉'],
    ['v2.0', '07.03', '用户反馈驱动：记录自动同步 + 150+ 触发词 + EmotionBar + 引用回复'],
    ['v2.1', '07.15', '标签分析面板（8 框架）+ 决策推演持久化 + 7天对话清理 + 文本选取引用'],
  ]),
  h3('版本策略说明'),
  body('不追求大版本发布节奏，而是持续小步迭代：每 2-3 天一个功能增量，每次提交对应一个可独立验证的用户价值闭环。v1.0→v2.1 共 27 次提交，平均每 22 小时一个可发布的功能增量。'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 九、技术架构 ═══════
CHILDREN.push(
  h2('九、技术架构一览'),
  body('前后端分离 + Serverless：前端纯静态部署 GitHub Pages（Vite 构建），后端 Vercel Serverless Function 代理 DeepSeek API。'),
  body('核心模块：api/chat.ts（Vercel 边缘函数，Native Web API + ReadableStream SSE）→ api-client.ts（前端 SSE 消费者，AbortController 取消）→ chat-store.ts（Zustand 状态流，localStorage 持久化）→ ChatView.tsx（React 流式渲染 + 思考折叠 + 引用按钮 + 文本选取）。'),
  body('数据层：localStorage 六组 key（ywe_journal / patterns / story / decisions / chat_messages / decision_answers），每组独立 CRUD + 7 天过期自动清理。Zustand 5 个独立 store（journal / pattern / story / ui / chat），各 store 之间通过 getState() 跨 store 读取。'),
  body('分析层：TagAnalysisPanel 纯前端计算——useMemo 按 tag 分组 entries → 逐 tag 查 TAG_FRAMEWORK_MAP → 计算 emotionDist / linkedPatterns / insights → 渲染 2 列网格卡片。决策分析额外读取 decisionAnswers 数据源。'),
  new Paragraph({ children: [], pageBreakBefore: true }),
);

// ═══════ 十、项目指标 ═══════
CHILDREN.push(
  h2('十、项目指标与后续规划'),
  h3('10.1 当前产品指标'),
  bullet('代码规模：6 层架构 / 12 个组件 / 5 个 Store / 4 个引擎 / 2 个部署目标'),
  bullet('功能完整度：核心闭环 100%（对话→记录→看板→分析→推演）、边缘体验 90%（引用/选取/持久化/清理）'),
  bullet('AI 质量：幻觉率从 v1.8 的 >30% → v1.9 的 <5%，system prompt 有效 token 利用率 >80%'),
  bullet('迭代效率：27 次提交 / 25 天，平均每 22 小时一个功能增量'),
  bullet('安全合规：API Key 零前端暴露，1 次 git filter-branch 历史清理，GitHub Security Advisory 响应 <24h'),
  h3('10.2 后续规划'),
  table(['优先级', '方向', '为什么现在不做'], [
    ['P1', '数据导出/导入（JSON→Markdown）', 'PMF 验证后再做——目前数据量小，手动复制即可'],
    ['P1', '移动端 PWA 适配', '核心用户群是桌面 Web 场景，移动端需求待验证'],
    ['P2', '多用户/分享', '自我认知是隐私数据，多人功能需要先建立信任模型'],
    ['P2', 'AI 主动推送/周期性复盘提醒', '推送打扰用户的前提是用户已有习惯——先跑通留存数据'],
  ]),
);

// ═══════ 构建文档 ═══════
const doc = new Document({
  numbering: {
    config: [
      { reference: 'chapters', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Noto Sans SC', size: 21 } } },
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: {
      default: new Header({
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '你的世界编辑器 · AI产品项目介绍', font: 'Noto Serif SC', size: 16, color: MUTED, italics: true })] })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: '— ', font: 'Noto Sans SC', size: 14, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'IBM Plex Mono', size: 14, color: MUTED }),
          new TextRun({ text: ' —', font: 'Noto Sans SC', size: 14, color: MUTED }),
        ]})],
      }),
    },
    children: CHILDREN,
  }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = resolve(__dirname, '..', '..', '你的世界编辑器-AI产品项目介绍.docx');
writeFileSync(outPath, buffer);
console.log(`✅ 已生成：${outPath}`);
