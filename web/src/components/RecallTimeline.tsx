import { useState, useMemo } from 'react'
import { useJournalStore } from '../stores/journal-store'
import { TAG_OPTIONS } from '../engine/types'
import type { Event } from '../engine/types'
import { Search, X } from 'lucide-react'

const EMOTION_LABEL: Record<string, string> = { colorful: '🎨', bright: '💡', dark: '🌑' }

function groupByMonth(entries: Event[]): [string, Event[]][] {
  const map = new Map<string, Event[]>()
  for (const e of entries) {
    const key = e.timestamp.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.entries()]
}

export default function RecallTimeline() {
  const entries = useJournalStore(s => s.entries)
  const [filter, setFilter] = useState<'all' | 'colorful' | 'bright' | 'dark'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = entries
    if (filter !== 'all') list = list.filter(e => e.emotion === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(e => (e.title + e.text).toLowerCase().includes(q))
    }
    return list
  }, [entries, filter, search])

  const months = groupByMonth(filtered)

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">回忆</p>
        <p className="text-xs text-muted mt-0.5">按时间浏览你的所有记录 · 共 {filtered.length} 条</p>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-4 border-b border-line bg-cream-2/50">
        <div className="flex flex-wrap items-center gap-3">
          {(['all', 'colorful', 'bright', 'dark'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                filter === f ? 'bg-navy text-cream' : 'bg-white border border-line text-muted hover:border-navy/20'
              }`}
            >
              {f === 'all' ? '全部' : EMOTION_LABEL[f] + ' ' + { colorful: '彩色', bright: '明亮', dark: '黑暗' }[f]}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索回忆..."
              className="pl-8 pr-3 py-1.5 bg-white border border-line rounded-full text-sm w-44 focus:outline-none focus:border-navy/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={12} className="text-muted/40" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6 max-w-3xl">
        {months.length === 0 ? (
          <p className="text-center text-muted py-12">没有找到匹配的记录。</p>
        ) : (
          months.map(([month, items]) => (
            <div key={month} className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <h3 className="font-serif text-2xl text-navy">{month.slice(0, 4)}年{parseInt(month.slice(5))}月</h3>
                <span className="text-xs font-mono text-muted/50">{items.length} 条</span>
              </div>
              <div className="relative pl-8 border-l-2 border-line">
                {items.map(e => (
                  <div key={e.id || e.timestamp} className="relative mb-5 last:mb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-[27px] top-5 w-3 h-3 rounded-full border-2 border-cream ${
                        e.emotion === 'colorful' ? 'bg-gold' : e.emotion === 'dark' ? 'bg-navy' : 'bg-soft-blue'
                      }`}
                    />
                    <div
                      onClick={() => setExpanded(expanded === e.id ? null : e.id!)}
                      className="bg-white border border-line rounded-xl p-5 hover:border-navy/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-muted">{e.timestamp.slice(8, 10)}日</span>
                        <span className="text-sm">{EMOTION_LABEL[e.emotion]}</span>
                        {e.tag && (
                          <span className="text-[10px] font-mono bg-soft-blue px-1.5 py-0.5 rounded text-navy">
                            {TAG_OPTIONS.find(t => t.value === e.tag)?.emoji} {e.tag}
                          </span>
                        )}
                        {e.mode && <span className="text-sm">{e.mode}</span>}
                      </div>
                      <h4 className="font-serif text-base text-navy mb-1">{e.title}</h4>
                      <p className="text-sm text-muted leading-relaxed line-clamp-2">{e.text}</p>
                      {expanded === e.id && (
                        <div className="mt-3 pt-3 border-t border-line">
                          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{e.text}</p>
                          {e.patternRefs.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {e.patternRefs.map(p => (
                                <span key={p} className="text-[10px] font-mono bg-gold/30 px-1.5 py-0.5 rounded text-navy">
                                  关联: {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
