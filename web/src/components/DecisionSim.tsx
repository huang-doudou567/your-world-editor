import { useState, useEffect, useCallback } from 'react'
import { usePatternStore } from '../stores/pattern-store'
import { useStoryStore } from '../stores/story-store'
import { Compass, Trash2 } from 'lucide-react'
import { loadDecisionAnswers, saveDecisionAnswer, clearDecisionAnswers } from '../data/db'

const PATHS = [
  {
    key: 'current',
    title: '📍 当前路径',
    sub: '继续深耕现在的方向',
    question: '如果继续深耕，5年后会怎样？',
    prompts: ['收入天花板在哪？', '什么技能在贬值？', '什么时候该撤？'],
  },
  {
    key: 'transition',
    title: '📍 转型路径',
    sub: '行业被AI重塑时的迁移',
    question: '该补什么能力？可以迁到哪个赛道？',
    prompts: ['已攒的可迁移能力？', '真正本钱是什么？', '转型第一步？'],
  },
  {
    key: 'ideal',
    title: '📍 理想路径',
    sub: '如果不考虑收入',
    question: '什么能让你真正幸福？',
    prompts: ['最适合的理想职业？', '现实约束？', '最接近幸福的选择？'],
  },
]

export default function DecisionSim() {
  const [activePath, setActivePath] = useState('current')
  const [answers, setAnswers] = useState<Record<string, string[]>>({ current: [], transition: [], ideal: [] })
  const [savedCount, setSavedCount] = useState(0)
  const [input, setInput] = useState('')
  const patterns = usePatternStore(s => s.patterns)
  const story = useStoryStore(s => s.sections)

  // 加载已保存的决策数据
  useEffect(() => {
    loadDecisionAnswers().then(items => {
      if (items.length === 0) return
      const restored: Record<string, string[]> = { current: [], transition: [], ideal: [] }
      for (const item of items) {
        if (restored[item.pathKey]) restored[item.pathKey].push(item.answer)
      }
      setAnswers(restored)
      setSavedCount(items.length)
    })
  }, [])

  const addAnswer = () => {
    if (!input.trim()) return
    const path = PATHS.find(p => p.key === activePath)!
    const promptIdx = answers[activePath].length
    const prompt = path.prompts[promptIdx] || '自定义思考'

    setAnswers(prev => ({ ...prev, [activePath]: [...prev[activePath], input] }))
    // 持久化保存
    saveDecisionAnswer({
      pathKey: activePath,
      pathTitle: path.title,
      prompt,
      answer: input,
      timestamp: new Date().toISOString(),
    })
    setSavedCount(c => c + 1)
    setInput('')
  }

  const handleClear = useCallback(async () => {
    if (!confirm('确定清空所有决策推演记录？此操作不可撤销。')) return
    await clearDecisionAnswers()
    setAnswers({ current: [], transition: [], ideal: [] })
    setSavedCount(0)
  }, [])

  const hasStory = story.some(s => s.body.trim().length > 0)
  const hasPatterns = patterns.length > 0
  const path = PATHS.find(p => p.key === activePath)!

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line flex items-center justify-between">
        <div>
          <p className="font-serif text-lg text-navy">决策推演</p>
          <p className="text-xs text-muted mt-0.5">
            三条路径同时推演 · 看清每条路的终点和代价
            {savedCount > 0 && <span className="text-green-500 ml-2">· 已保存 {savedCount} 条推演记录</span>}
          </p>
        </div>
        {savedCount > 0 && (
          <button onClick={handleClear} className="text-xs text-muted/40 hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 size={12} /> 清空
          </button>
        )}
      </div>

      <div className="p-6 max-w-4xl">
        {/* Path selector */}
        <div className="flex gap-3 mb-8 overflow-x-auto">
          {PATHS.map(p => (
            <button
              key={p.key}
              onClick={() => setActivePath(p.key)}
              className={`flex-shrink-0 px-5 py-3 rounded-xl text-left transition-all ${
                activePath === p.key
                  ? 'bg-navy text-cream shadow-lg'
                  : 'bg-white border border-line text-navy hover:border-navy/20'
              }`}
            >
              <p className="font-serif text-sm">{p.title}</p>
              <p className="text-[11px] opacity-60">{p.sub}</p>
            </button>
          ))}
        </div>

        {/* Active path */}
        <div className="bg-white border border-line rounded-xl p-6 mb-6">
          <h3 className="font-serif text-lg text-navy mb-2 flex items-center gap-2">
            <Compass size={20} />
            {path.question}
          </h3>
          <div className="space-y-3 mb-6">
            {path.prompts.map((prompt, i) => (
              <div key={i} className="bg-cream border border-line rounded-lg p-4">
                <p className="text-xs font-mono text-muted mb-2">{prompt}</p>
                <p className="text-sm text-navy">
                  {answers[activePath][i] || (
                    <span className="text-muted/30 italic">
                      {!hasStory && i === 2 ? '（暂无叙事层数据——去「我的故事」填价值观）' :
                       !hasPatterns && i === 0 ? '（暂无模式数据——记多了会自己长出来）' :
                       '在下方输入你的回答...'}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="写下你的思考……（自动保存到本地，刷新不丢失）"
              className="flex-1 resize-none bg-cream border border-line rounded-lg p-3 text-sm min-h-[60px] focus:outline-none focus:border-navy/30"
              rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addAnswer() } }}
            />
            <button
              onClick={addAnswer}
              className="flex-shrink-0 px-4 py-2 bg-navy text-cream rounded-lg text-sm hover:bg-navy-light transition-colors"
            >
              填入
            </button>
          </div>
        </div>

        {/* Summary */}
        {Object.values(answers).some(a => a.length > 0) && (
          <div className="bg-soft-blue border border-line rounded-xl p-6">
            <h3 className="font-serif text-base text-navy mb-3">推演总结</h3>
            <p className="text-sm text-muted">
              你已经在 {Object.entries(answers).filter(([_, a]) => a.length > 0).length} 条路径上写下了思考。
              在真实 Claude Code 版本中，系统会基于你的日记、模式和价值观，为每条路径生成具体的数字和行动步骤。
              最终决定由你来做——AI 只帮你看见你正在回避的决定到底是什么。
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted/30 text-center mt-8 font-mono">
          推演层的设计参考了斯坦福人生设计课（Bill Burnett & Dave Evans）的奥德赛计划
        </p>
      </div>
    </div>
  )
}
