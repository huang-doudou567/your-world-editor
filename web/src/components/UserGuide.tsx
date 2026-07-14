import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const SECTIONS = [
  {
    title: '🚀 快速开始',
    items: [
      { q: '这是什么？', a: '你的世界编辑器是一套 AI 驱动的自我认知操作系统。它帮你记录日常事件、自动分类情绪、发现行为模式、推演人生路径。网页版直连 DeepSeek 真实 AI，支持流式对话，零安装零注册，打开即用。' },
      { q: '第一次打开怎么用？（完整启动流程）', a: '① 打开 https://huang-doudou567.github.io/your-world-editor/ → 自动加载演示数据，看到首页"对话"页面\n② 右上角确认 Key 已设（绿色小标签显示"Key 已设"，说明已连接 DeepSeek）→ 可直接对话\n③ 在底部输入框说：\"记一下，今天______\"（填写今天发生的一件事）→ AI 自动判断记录价值、标注情绪窗格和标签，同步写入流水账\n④ 说\"照镜子\"或\"这周怎么样\" → AI 基于已有记录做周复盘\n⑤ 切换到侧边栏「看板」→ 查看系统健康度 / 情绪饼图 / 最近记录\n⑥ 切换到「分析」→ 按标签维度查看职业定位 / 择偶定位等分析卡片（演示数据有 健康/工作事业/感情/模式 四个卡片）\n⑦ 切换到「决策推演」→ 在三条路径空白框填入思考，按 Enter 提交 → 自动保存到本地\n⑧ 切回对话页，继续记录日常生活 → 所有数据自动持久化，刷新不丢失' },
      { q: '这是真实 AI 吗？', a: '是的。网页版直连 DeepSeek API（deepseek-chat 模型），支持流式实时对话，无需后端服务器。AI 能理解自然语言、做语义推理、给出深度回复。内置默认 Key，打开即用。如需自己的 Key，点右上角按钮设置。' },
    ],
  },
  {
    title: '💬 对话页',
    items: [
      { q: '对话页能做什么？', a: '这是主交互入口。你可以用自然语言和系统对话——说「记一下」「搜一下」「推演一下」「照镜子」等，系统会自动识别你的意图并执行对应的 Pipeline。' },
      { q: '有哪些触发词？', a: '记流水账：「记一下」「今天」「刚刚」「记录」「写一下」。搜索：「搜一下」「上次」「之前」「找一下」「回忆」。决策推演：「推演一下」「帮我推演」「三条路」「未来规划」。周复盘：「照镜子」「周复盘」「复盘」「这周怎么样」。情绪统计：「我这周住在哪个窗格」「情绪怎么样」「最近状态」。记梦：「做梦」「梦到」「梦里」「记梦」。收藏：「收藏」「金句」「座右铭」。系统评估：「系统评估」「效果怎么样」「打分」。更多口语变体都能识别——系统内置 150+ 触发词和 10 种场景路由。' },
      { q: '怎么设置自己的 API Key？', a: '网页版内置默认 DeepSeek Key，打开即可对话。如需使用自己的 Key（避免额度共享），点右上角「未设Key」按钮输入 sk- 开头的 Key，也可在 platform.deepseek.com 注册获取。Key 存在你浏览器 localStorage 中，仅本人可见。' },
    ],
  },
  {
    title: '📊 数据看板',
    items: [
      { q: '看板上显示什么？', a: '系统健康度（活跃天数+条目数）、盲区改善度（盲区再现率是否在下降）、叙事沉淀率（merge 进度）。情绪窗格饼图显示彩色/明亮/黑暗的分布。系统概览提供总条目、已识别盲区等关键数字。' },
      { q: '三个评分是怎么算的？', a: '健康度基于活跃天数和条目数的加权。盲区改善度 = (1 - 盲区再现率) × 100。叙事沉淀率基于 merge 率的百分比。评分是相对参考值，不是绝对值——随着数据积累会越来越有参考意义。' },
      { q: '最近记录可以编辑吗？', a: '可以。点击每条记录旁的编辑按钮，就可以修改标题、正文、标签、情绪窗格。保存后立即生效，刷新不会丢失。' },
    ],
  },
  {
    title: '📊 标签分类分析',
    items: [
      { q: '标签分类分析是什么？', a: '在看板维度之外，按 8 个标签（感情/梦境/健康/财务/工作事业/决策/模式/洞察）做独立分析。每个标签对应一个专属分析框架，如职业定位、择偶定位、健康画像、决策风格分析等。从侧边栏「分析」进入。' },
      { q: '分析卡片包含哪些信息？', a: '每张卡片显示：记录总数与情绪分布迷你进度条、自动洞察（主导情绪/盲区比例/趋势/关联模式）、关联的行为模式、最近 5 条该标签下的记录。点击条目可跳转流水账，点击模式可跳转模式页。' },
      { q: '八个分析框架分别是什么？', a: '💼 职业定位 — 厘清优势与盲区；❤️ 择偶定位 — 复盘关系模式；🏥 健康画像 — 身体规律与压力触发；💰 财务行为模式 — 收支习惯与金钱信念；🎯 决策风格分析 — 决策逻辑与常见陷阱；🔄 行为模式洞察 — 反复循环与触发链路；💡 认知成长轨迹 — 顿悟时刻与认知进化；🌙 梦境主题分析 — 反复梦境主题与情绪底色。' },
      { q: '决策推演数据和标签分析有什么关联？', a: '决策推演页面的所有思考会自动保存到本地。🎯 决策风格分析卡片会读取推演记录，展示路径分布（当前/转型/理想各几条）和最近思考摘要。推演数据与标签事件并列展示，互相补充。' },
      { q: '分析会自动更新吗？', a: '是的。每次进入分析页都会从 localStorage 实时计算。给流水账添加标签后，对应的分析卡片自动出现并更新数据。没有标签的事件不会出现在分析中。' },
    ],
  },
  {
    title: '📝 流水账',
    items: [
      { q: '流水账是什么？', a: '所有事件记录的倒序列表。每条记录有时间戳、情绪窗格 emoji、标签、标题和正文。你可以在这里查看、编辑、删除你的所有记录。' },
      { q: '怎么编辑一条记录？', a: '点击记录右上角的铅笔图标，进入编辑模式。可以修改标题、正文、标签（8 个预定义标签可选）、情绪窗格和模式标记。点保存生效。' },
      { q: '标签有哪些？', a: '🏷 无标签 / ❤️ 感情 / 🌙 梦境 / 🏥 健康 / 💰 财务 / 💼 工作事业 / 🎯 决策 / 🔄 模式 / 💡 洞察。系统在对话中会自动尝试识别标签，但你随时可以手动修改。' },
      { q: '怎么删除一条记录？', a: '点击记录右上角的垃圾桶图标即可删除。注意：删除后不可恢复。' },
    ],
  },
  {
    title: '⏳ 回忆',
    items: [
      { q: '回忆页和流水账有什么区别？', a: '流水账是简单的倒序列表——适合日常查看和管理。回忆页是按月份分组的沉浸式时间线——适合「坐下来翻翻过去」。你可以按情绪窗格筛选（只看彩色/明亮/黑暗），也可以用搜索框搜特定关键词。' },
      { q: '怎么用回忆页？', a: '点侧边栏「回忆」进入。顶部有情绪筛选按钮，右边有搜索框。每条记录以时间线卡片展示——点击卡片展开全文。' },
    ],
  },
  {
    title: '📡 模式',
    items: [
      { q: '模式是什么？', a: '系统从你的流水账里自动识别的行为规律。分两种——盲区（反复栽进去的坑）和正向模式（你做对的事）。每条模式包含触发条件、核心模式、对策，以及案例日志（每次触发的时间和结果）。' },
      { q: '模式怎么来？', a: '在完整版中，Python 脚本做主题聚类和周期检测，LLM 做语义判断。网页版使用预设演示数据展示模式结构。你记录的事件中如果提到已有模式的触发条件，系统会自动关联。' },
    ],
  },
  {
    title: '📚 我的故事',
    items: [
      { q: '我的故事是什么？', a: '叙事层主库——你的判断框架、价值观、金句库、短诗。这是"图书馆"，只放定稿过的、能代表你的内容。与流水账不同——流水账是收件箱，故事是已沉淀的东西。' },
      { q: '怎么往里加内容？', a: '在对话中说「收藏xxx」或「记一首xxx」——系统会自动写入。也可以直接在这个页面点编辑按钮手动写。' },
    ],
  },
  {
    title: '🧭 决策推演',
    items: [
      { q: '决策推演怎么用？', a: '侧边栏点「决策推演」进入。三条路径（当前深耕/转型迁移/理想不考虑收入）分别推演。在每条路径的空白区填入思考，按 Enter 提交。所有推演记录自动保存到本地，刷新不丢失。参考了斯坦福人生设计课的奥德赛计划。' },
      { q: 'AI 会替我做决定吗？', a: '不会。设计原则第 9 条：不替用户做人生决定。系统只帮你看见每条路的终点和代价，最终决定必须由你自己说出口。' },
    ],
  },
  {
    title: '📋 版本历史',
    items: [
      { q: 'v2.1 (2026-07-15) — 当前版本', a: '新增标签分类分析面板（8 个分析框架）；决策推演数据持久化（localStorage 自动保存）；使用指南全面更新。' },
      { q: 'v2.0 (2026-07-03)', a: '四项核心修复：记录自动同步流水账（阈值 4→4）；触发词从 30 扩展到 150+（10 种场景路由）；EmotionBar 情绪窗格指示器（侧边栏 + 对话页）；AI 消息引用回复按钮。' },
      { q: 'v1.9 (2026-06-30)', a: '紧急修复 AI 对话上下文丢失（role 从 system 改为 ai）；精简 system prompt 减少幻觉（2200→300 chars）；新增"先回应，后记录"准则。' },
      { q: 'v1.8 (2026-06-30)', a: '重大更新：集成 DeepSeek API SSE 流式对话，替代旧关键词匹配引擎。新增 server/ 后端代理模块，ChatView 支持流式渲染、停止生成、重试。' },
      { q: 'v1.7 (2026-06-26)', a: '交互式 Web 应用上线：React + Vite + Zustand 全栈 SPA。对话 / 看板 / 流水账 / 模式 / 故事 / 决策推演 / 引导 7 个页面。GitHub Pages 部署。' },
      { q: 'v1.0–v1.5 (2026-06-20~24)', a: '从初版三层 AI 自我认知系统（记录→检索→洞察），逐步迭代至决策推演模块（三条人生路径）、情绪窗格三分类、7 步引导流程、多平台适配。v1.0 基于 Python 脚本 + Markdown 文件，纯 CLI。' },
    ],
  },
  {
    title: '❓ FAQ',
    items: [
      { q: '数据存在哪？会丢吗？', a: '所有数据（事件记录、模式、故事、决策推演、API Key）存在你浏览器的 localStorage 中。不会自动上传到任何服务器。清除浏览器数据会导致数据丢失，建议定期手动备份。完整版（Claude Code）数据是本地 Markdown 文件，更安全。' },
      { q: '怎么备份数据？', a: '当前版本暂未提供导出功能（下一版计划加入）。在完整版中，你的所有数据是纯 Markdown 文件，可以用任何编辑器打开和备份。' },
      { q: '网页版和 CLI 版选哪个？', a: '网页版：零安装、浏览器即用、直连 DeepSeek 真实 AI，支持流式对话。CLI 版：真正的本地 LLM 推理、Python 脚本做深度聚类分析、数据 Markdown 完全可控。建议先用网页版体验，觉得有用再装 CLI 版。' },
      { q: '怎么反馈建议？', a: '去 GitHub Issues 提：github.com/huang-doudou567/your-world-editor/issues。或者直接在这里的对话页告诉系统——虽然不能真的发到 GitHub，但可以帮助你理清反馈内容。' },
    ],
  },
]

export default function UserGuide() {
  const [openSections, setOpenSections] = useState<number[]>([0])
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleSection = (i: number) => {
    setOpenSections(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">使用指南</p>
        <p className="text-xs text-muted mt-0.5">完整的功能说明和操作指引</p>
      </div>

      <div className="p-6 max-w-3xl space-y-4">
        {SECTIONS.map((section, si) => (
          <div key={si} className="bg-white border border-line rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(si)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-cream-2/30 transition-colors"
            >
              <h3 className="font-serif text-base text-navy">{section.title}</h3>
              {openSections.includes(si) ? <ChevronDown size={18} className="text-muted/50" /> : <ChevronRight size={18} className="text-muted/50" />}
            </button>

            {openSections.includes(si) && (
              <div className="px-6 pb-4 space-y-2">
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`
                  const isOpen = openItems[key]
                  return (
                    <div key={key} className="border-t border-line pt-2 first:border-0 first:pt-0">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center gap-2 py-2 text-left hover:text-navy transition-colors"
                      >
                        <span className="text-xs text-muted">{isOpen ? '▾' : '▸'}</span>
                        <span className="text-sm text-navy">{item.q}</span>
                      </button>
                      {isOpen && (
                        <p className="text-sm text-muted leading-relaxed pl-5 pb-2">{item.a}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
