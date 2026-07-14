import { useMemo, useState, useEffect } from 'react'
import { useJournalStore } from '../stores/journal-store'
import { usePatternStore } from '../stores/pattern-store'
import { useUIStore } from '../stores/ui-store'
import { TAG_OPTIONS, type Event, type EventTag, type Pattern } from '../engine/types'
import { TAG_FRAMEWORKS, type TagFramework } from '../engine/tag-frameworks'
import { loadDecisionAnswers, type DecisionAnswerItem } from '../data/db'

const EMOTION_EMOJI: Record<string, string> = { colorful: '🎨', bright: '💡', dark: '🌑' }

export default function TagAnalysisPanel() {
  const entries = useJournalStore(s => s.entries)
  const patterns = usePatternStore(s => s.patterns)
  const setView = useUIStore(s => s.setView)
  const [decisionAnswers, setDecisionAnswers] = useState<DecisionAnswerItem[]>([])

  useEffect(() => { loadDecisionAnswers().then(setDecisionAnswers) }, [])

  // 按标签分组
  const tagGroups = useMemo(() => {
    const map = new Map<EventTag, Event[]>()
    for (const e of entries) {
      if (!e.tag) continue
      const list = map.get(e.tag) || []
      list.push(e)
      map.set(e.tag, list)
    }
    return map
  }, [entries])

  // 按框架顺序排列有记录的分组
  const orderedTags = useMemo(() => {
    return TAG_FRAMEWORKS
      .filter(f => tagGroups.has(f.tag))
      .map(f => ({
        framework: f,
        events: tagGroups.get(f.tag)!,
      }))
  }, [tagGroups])

  if (orderedTags.length === 0) {
    const hasEntries = entries.length > 0
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-6 py-4 border-b border-line">
          <p className="font-serif text-lg text-navy">标签分类分析</p>
          <p className="text-xs text-muted mt-0.5">按标签维度深度分析你的行为模式与认知轨迹</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">📊</p>
            <p className="font-serif text-xl text-navy mb-2">
              {hasEntries ? '还没有标签数据' : '还没有记录'}
            </p>
            <p className="text-sm text-muted leading-relaxed mb-6">
              {hasEntries
                ? '在「流水账」中为条目添加标签后，这里会自动生成按标签维度的分类分析。'
                : '去「对话」页记录你的第一条吧。'}
            </p>
            <button
              onClick={() => setView(hasEntries ? 'journal' : 'chat')}
              className="px-6 py-2 bg-navy text-cream rounded-xl text-sm hover:bg-navy-light transition-colors"
            >
              {hasEntries ? '去流水账' : '开始对话'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">标签分类分析</p>
        <p className="text-xs text-muted mt-0.5">
          按标签维度深度分析 {orderedTags.length} 个维度 · 共 {[...tagGroups.values()].flat().length} 条标记记录
        </p>
      </div>

      <div className="p-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orderedTags.map(({ framework, events }) => (
            <TagCard
              key={framework.tag}
              framework={framework}
              events={events}
              patterns={patterns}
              setView={setView}
              decisionAnswers={framework.tag === '决策' ? decisionAnswers : []}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 单标签分析卡片 ──
function TagCard({
  framework,
  events,
  patterns,
  setView,
  decisionAnswers,
}: {
  framework: TagFramework
  events: Event[]
  patterns: Pattern[]
  setView: (v: any) => void
  decisionAnswers: DecisionAnswerItem[]
}) {
  const tagOption = TAG_OPTIONS.find(t => t.value === framework.tag)!
  const total = events.length
  const totalWithExtra = total + decisionAnswers.length

  // 情绪分布
  const emotionDist = { colorful: 0, bright: 0, dark: 0 }
  for (const e of events) emotionDist[e.emotion]++
  const dominant = emotionDist.colorful >= emotionDist.bright && emotionDist.colorful >= emotionDist.dark ? 'colorful'
    : emotionDist.bright >= emotionDist.dark ? 'bright' : 'dark'
  const dominantPct = Math.round((emotionDist[dominant] / total) * 100)

  // 关联模式：从事件的 patternRefs 中提取
  const refNames = new Set(events.flatMap(e => e.patternRefs))
  const linkedPatterns = patterns.filter(p => refNames.has(p.id || '') || refNames.has(p.name))

  // 盲区/正向统计
  const blindCount = events.filter(e => e.mode === '❌').length
  const positiveCount = events.filter(e => e.mode === '✅').length

  // 近30天趋势
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recent = events.filter(e => e.timestamp.slice(0, 10) >= thirtyDaysAgo)
  const older = events.length - recent.length

  // 自动洞察
  const insights = useMemo(() => {
    const list: { emoji: string; text: string }[] = []

    list.push({
      emoji: EMOTION_EMOJI[dominant], text: `${dominant === 'colorful' ? '积极' : dominant === 'dark' ? '沉重' : '中性'}情绪为主 (${dominantPct}%)，共 ${total} 条记录`,
    })

    if (blindCount > 0 && blindCount > positiveCount) {
      list.push({ emoji: '⚠️', text: `盲区事件 (${blindCount}) 多于正向 (${positiveCount})，注意识别触发模式` })
    } else if (positiveCount > 0) {
      list.push({ emoji: '✅', text: `正向模式 ${positiveCount} 次，转化良好` })
    }

    if (linkedPatterns.length > 0) {
      list.push({ emoji: '🔗', text: `关联 ${linkedPatterns.length} 个模式` })
    } else {
      list.push({ emoji: '🔍', text: '暂无直接关联模式，随着记录积累会逐渐浮现' })
    }

    if (older > 0 && recent.length > 0) {
      const trend = recent.length >= older ? '📈 上升' : '📉 下降'
      list.push({ emoji: '', text: `${trend} → 近30天 ${recent.length} 条，历史 ${older} 条` })
    } else if (older === 0) {
      list.push({ emoji: '🆕', text: '近期新增的关注领域，持续记录中' })
    }

    return list
  }, [events, total, dominant, dominantPct, blindCount, positiveCount, linkedPatterns, recent.length, older])

  // 决策推演附加洞察
  const decisionInsights = useMemo(() => {
    if (decisionAnswers.length === 0) return []
    const paths = [...new Set(decisionAnswers.map(a => a.pathKey))]
    const currentCount = decisionAnswers.filter(a => a.pathKey === 'current').length
    const transitionCount = decisionAnswers.filter(a => a.pathKey === 'transition').length
    const idealCount = decisionAnswers.filter(a => a.pathKey === 'ideal').length
    const maxPath = currentCount >= transitionCount && currentCount >= idealCount ? '当前路径'
      : transitionCount >= idealCount ? '转型路径' : '理想路径'
    return [
      { emoji: '🧭', text: `已记录 ${decisionAnswers.length} 条推演思考，覆盖 ${paths.length} 条路径（当前${currentCount}/转型${transitionCount}/理想${idealCount}）` },
      { emoji: '📊', text: `${maxPath}思考最多，决定之前先推演，看清每条路的代价` },
    ]
  }, [decisionAnswers])

  const allInsights = [...insights, ...decisionInsights]

  return (
    <div className="bg-white border border-line rounded-xl p-6 animate-fadeIn hover:border-navy/10 transition-colors">
      {/* 头部：emoji + 标题 + 计数 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{tagOption.emoji}</span>
        <h3 className="font-serif text-base text-navy">{framework.title}</h3>
        <span className="ml-auto text-xs font-mono text-muted bg-cream px-2 py-0.5 rounded-full flex-shrink-0">
          {totalWithExtra} 条
        </span>
      </div>

      <p className="text-xs text-muted mb-4 leading-relaxed">{framework.description}</p>

      {/* 迷你情绪条 */}
      <div className="flex items-center gap-2 mb-4">
        {(['colorful', 'bright', 'dark'] as const).map(k => {
          const pct = total > 0 ? Math.round((emotionDist[k] / total) * 100) : 0
          if (pct === 0) return null
          const barColor = { colorful: 'bg-gold', bright: 'bg-soft-blue', dark: 'bg-navy' }[k]
          return (
            <div key={k} className="flex items-center gap-1 flex-1" title={`${EMOTION_EMOJI[k]} ${pct}%`}>
              <span className="text-[11px] flex-shrink-0">{EMOTION_EMOJI[k]}</span>
              <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.max(pct, 5)}%` }} />
              </div>
              <span className="text-[10px] font-mono text-muted/60 w-8 text-right flex-shrink-0">{pct}%</span>
            </div>
          )
        })}
      </div>

      {/* 洞察列表 */}
      <div className="mb-4 space-y-1">
        <p className="text-[10px] font-mono text-muted/50 tracking-wider uppercase mb-1">自动洞察</p>
        {allInsights.map((insight, i) => (
          <p key={i} className="text-xs text-navy/80 flex items-start gap-1.5 leading-relaxed">
            {insight.emoji && <span className="flex-shrink-0">{insight.emoji}</span>}
            <span>{insight.text}</span>
          </p>
        ))}
      </div>

      {/* 关联模式 */}
      {linkedPatterns.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-mono text-muted/50 tracking-wider uppercase mb-2">关联模式</p>
          <div className="flex flex-wrap gap-1.5">
            {linkedPatterns.map(p => (
              <button
                key={p.id || p.name}
                onClick={() => setView('patterns')}
                className="text-xs bg-soft-blue px-2 py-0.5 rounded text-navy hover:bg-soft-blue/70 transition-colors"
              >
                {p.type === 'blind_spot' ? '⚠️' : '✨'} {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 决策推演记录（仅决策标签） */}
      {decisionAnswers.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-mono text-muted/50 tracking-wider uppercase mb-2">
            推演记录 · {decisionAnswers.length} 条
          </p>
          <div className="space-y-1">
            {decisionAnswers.slice(-4).reverse().map((item, i) => (
              <div
                key={i}
                onClick={() => setView('simulate')}
                className="flex items-start gap-2 text-xs py-1 border-b border-line/50 last:border-0 cursor-pointer hover:bg-cream/50 transition-colors rounded px-1 -mx-1"
              >
                <span className="text-[10px] font-mono text-muted/50 flex-shrink-0 mt-0.5">
                  {item.timestamp.slice(0, 10).replace('2026-', '').replace('2025-', '')}
                </span>
                <span className="text-navy/70 flex-1 leading-relaxed truncate">{item.answer}</span>
                <span className="text-[10px] text-muted/40 flex-shrink-0">{item.pathTitle.slice(2)}</span>
              </div>
            ))}
          </div>
          {decisionAnswers.length > 4 && (
            <p className="text-[10px] text-muted/30 text-center mt-1">
              及 {decisionAnswers.length - 4} 条更早的记录
            </p>
          )}
        </div>
      )}

      {/* 最近记录 */}
      <div>
        <p className="text-[10px] font-mono text-muted/50 tracking-wider uppercase mb-2">最近记录</p>
        <div className="space-y-0.5">
          {events.slice(0, 5).map(e => (
            <div
              key={e.id || e.timestamp}
              onClick={() => setView('journal')}
              className="flex items-center gap-2 text-xs py-1.5 border-b border-line/50 last:border-0 cursor-pointer hover:bg-cream/50 transition-colors rounded px-1 -mx-1"
            >
              <span className="text-[10px] font-mono text-muted/60 flex-shrink-0">{e.timestamp.slice(5, 10)}</span>
              <span className="flex-shrink-0">{EMOTION_EMOJI[e.emotion]}</span>
              <span className="text-navy truncate flex-1">{e.title}</span>
              {e.mode && <span className="text-[10px] flex-shrink-0">{e.mode}</span>}
            </div>
          ))}
          {events.length > 5 && (
            <p className="text-[10px] text-muted/40 text-center pt-1">... 还有 {events.length - 5} 条</p>
          )}
        </div>
      </div>
    </div>
  )
}
