import { useJournalStore } from '../stores/journal-store'
import { useUIStore } from '../stores/ui-store'

const EMOTION_CONFIG = {
  colorful: { emoji: '🎨', label: '彩色', color: '#f0e0aa' },
  bright:   { emoji: '💡', label: '明亮', color: '#e1f3ff' },
  dark:     { emoji: '🌑', label: '黑暗', color: '#0f1829' },
} as const

export default function EmotionBar({ compact = false }: { compact?: boolean }) {
  const entries = useJournalStore(s => s.entries)
  const setView = useUIStore(s => s.setView)

  const dist = { colorful: 0, bright: 0, dark: 0 }
  for (const e of entries) dist[e.emotion]++
  const total = dist.colorful + dist.bright + dist.dark

  const dominant = total > 0
    ? (dist.colorful >= dist.bright && dist.colorful >= dist.dark ? 'colorful' as const
      : dist.bright >= dist.dark ? 'bright' as const
      : 'dark' as const)
    : null

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  if (compact) {
    return (
      <div className="px-2 py-2">
        <button
          onClick={() => setView('dashboard')}
          className="w-full rounded-lg bg-white/5 hover:bg-white/10 transition-colors px-3 py-2.5 text-left group"
          title="点击查看情绪数据看板"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-white/30 tracking-wider">情绪窗格</span>
            <span className="text-[9px] text-white/20 font-mono">{total}条</span>
          </div>
          <div className="space-y-1">
            {(['colorful', 'bright', 'dark'] as const).map(key => {
              const cfg = EMOTION_CONFIG[key]
              const w = pct(dist[key])
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-[11px] w-5 text-center flex-shrink-0">{cfg.emoji}</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(w, 2)}%`, background: cfg.color }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-white/30 w-7 text-right flex-shrink-0">{w}%</span>
                </div>
              )
            })}
          </div>
          {dominant && (
            <p className="text-[9px] text-white/40 mt-1.5 text-center font-mono">
              最近住在 {EMOTION_CONFIG[dominant].emoji} {EMOTION_CONFIG[dominant].label}窗格
            </p>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <h3 className="font-serif text-base text-navy mb-3">情绪窗格</h3>
      <div className="space-y-2.5">
        {(['colorful', 'bright', 'dark'] as const).map(key => {
          const cfg = EMOTION_CONFIG[key]
          const w = pct(dist[key])
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">{cfg.emoji}</span>
              <span className="text-xs text-navy w-10 flex-shrink-0">{cfg.label}</span>
              <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(w, 3)}%`, background: cfg.color }}
                />
              </div>
              <span className="text-xs font-mono text-muted w-10 text-right flex-shrink-0">
                {dist[key]} <span className="text-[10px]">({w}%)</span>
              </span>
            </div>
          )
        })}
      </div>
      {dominant && total > 0 && (
        <p className="text-xs text-muted mt-3 pt-3 border-t border-line text-center">
          最近主要住在 {EMOTION_CONFIG[dominant].emoji} <strong className="text-navy">{EMOTION_CONFIG[dominant].label}窗格</strong>
        </p>
      )}
      {total === 0 && (
        <p className="text-xs text-muted text-center py-2">暂无情绪数据，去对话页记几条吧</p>
      )}
    </div>
  )
}
