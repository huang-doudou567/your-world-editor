import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const SECTIONS = [
  {
    title: '🚀 快速开始',
    items: [
      { q: '这是什么？', a: '你的世界编辑器是一套 AI 驱动的自我认知操作系统。它帮你记录日常事件、自动分类情绪、发现行为模式、推演人生路径。所有数据存你本地浏览器，零云端。' },
      { q: '怎么开始用？', a: '先说「搭建」或点击侧边栏「重新引导」进入 7 步引导流程——起昵称、投喂资料、提炼模式、书摘、试记、收尾，5 分钟搭好。' },
      { q: '这是真实 AI 吗？', a: '网页版是交互演示版——AI 回复用关键词匹配模拟，标注"模拟回复"。完整版需要在 Claude Code / Codex / Cursor 中加载 SKILL.md，使用真正的 LLM 做语义推理。' },
    ],
  },
  {
    title: '💬 对话页',
    items: [
      { q: '对话页能做什么？', a: '这是主交互入口。你可以用自然语言和系统对话——说「记一下」「搜一下」「推演一下」「照镜子」等，系统会自动识别你的意图并执行对应的 Pipeline。' },
      { q: '有哪些触发词？', a: '记流水账：「记一下」「今天」「刚刚」。搜索：「上次」「之前」「找一下」。决策推演：「推演一下」「帮我推演」「人生推演」。周复盘：「照镜子」「周复盘」。情绪统计：「我这周住在哪个窗格」。系统评估：「系统评估」「效果怎么样」。' },
      { q: '为什么有些回复标"模拟回复"？', a: '网页版使用关键词路由和预设模板来模拟 AI 行为。它没有真正的 LLM 推理能力——无法做深度的模式发现和跨事件语义关联。完整版把这些交给真实的 Claude。' },
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
      { q: '决策推演怎么用？', a: '在侧边栏点「决策推演」进入。三条路径（当前深耕/转型迁移/理想不考虑收入）分别推演。在每条路径的空白区填入你的思考，系统帮你结构化。参考了斯坦福人生设计课的奥德赛计划。' },
      { q: 'AI 会替我做决定吗？', a: '不会。设计原则第 9 条：不替用户做人生决定。系统只帮你看见每条路的终点和代价，最终决定必须由你自己说出口。' },
    ],
  },
  {
    title: '❓ FAQ',
    items: [
      { q: '数据存在哪？会丢吗？', a: '存在你浏览器的 localStorage 中。不会自动上传到任何服务器。清除浏览器数据会导致数据丢失——定期导出备份。完整版（Claude Code）数据是本地 Markdown 文件，更安全。' },
      { q: '怎么备份数据？', a: '当前版本暂未提供导出功能（下一版计划加入）。在完整版中，你的所有数据是纯 Markdown 文件，可以用任何编辑器打开和备份。' },
      { q: '网页版和 CLI 版选哪个？', a: '网页版：零安装、浏览器即用、适合体验和浏览。CLI 版：真正的 LLM 推理、Python 脚本做深度分析、数据是 Markdown 文件。建议先用网页版体验，觉得有用再装 CLI 版。' },
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
