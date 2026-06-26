import { useJournalStore } from '../stores/journal-store'
import { usePatternStore } from '../stores/pattern-store'
import { useUIStore } from '../stores/ui-store'
import { TAG_OPTIONS } from '../engine/types'
import { getSystemStats } from '../engine/store'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Edit3 } from 'lucide-react'

const EMOTION_COLORS = { colorful: '#f0e0aa', bright: '#e1f3ff', dark: '#0f1829' }

export default function Dashboard() {
  const entries = useJournalStore(s => s.entries)
  const patterns = usePatternStore(s => s.patterns)
  const setView = useUIStore(s => s.setView)
  const stats = getSystemStats(entries, patterns)

  const emotionData = [
    { name: '🎨 彩色', value: stats.emotionDist.colorful, color: EMOTION_COLORS.colorful },
    { name: '💡 明亮', value: stats.emotionDist.bright, color: EMOTION_COLORS.bright },
    { name: '🌑 黑暗', value: stats.emotionDist.dark, color: EMOTION_COLORS.dark },
  ].filter(d => d.value > 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">数据看板</p>
        <p className="text-xs text-muted mt-0.5">系统健康度 / 情绪分布 / 盲区趋势</p>
      </div>

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Three gauge cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GaugeCard label="系统健康度" value={stats.healthScore} color="bg-navy" />
          <GaugeCard label="盲区改善度" value={stats.blindSpotImprovement} color="bg-navy-light" />
          <GaugeCard label="叙事沉淀率" value={stats.narrativeScore} color="bg-navy" />
        </div>

        {/* Emotion distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-line rounded-xl p-6">
            <h3 className="font-serif text-base text-navy mb-4">情绪窗格分布</h3>
            {emotionData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={emotionData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {emotionData.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {emotionData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                      <span>{d.name}</span>
                      <span className="font-mono text-muted">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">暂无数据</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-white border border-line rounded-xl p-6">
            <h3 className="font-serif text-base text-navy mb-4">系统概览</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="总条目" value={String(stats.totalEntries)} />
              <StatItem label="活跃天数" value={String(stats.activeDays)} />
              <StatItem label="已识别盲区" value={String(stats.blindSpotPatterns)} />
              <StatItem label="正向模式" value={String(stats.positivePatterns)} />
              <StatItem label="Merge 率" value={`${Math.round(stats.mergeRate * 100)}%`} />
              <StatItem label="盲区再现率" value={`${Math.round(stats.blindSpotRecurrence * 100)}%`} />
            </div>
          </div>
        </div>

        {/* Recent entries */}
        <div className="bg-white border border-line rounded-xl p-6">
          <h3 className="font-serif text-base text-navy mb-4">最近记录</h3>
          <div className="space-y-2">
            {entries.slice(0, 8).map(e => (
              <div key={e.id || e.timestamp} className="flex items-start gap-3 text-sm py-1.5 border-b border-line last:border-0 group">
                <span className="text-[11px] font-mono text-muted whitespace-nowrap">{e.timestamp.slice(5, 10)}</span>
                <span className="text-muted">
                  {{ colorful: '🎨', bright: '💡', dark: '🌑' }[e.emotion]}
                </span>
                <span className="text-navy flex-1 truncate">{e.title}</span>
                {e.tag && (
                  <span className="text-[10px] font-mono bg-soft-blue px-1.5 py-0.5 rounded text-navy whitespace-nowrap">
                    {TAG_OPTIONS.find(t => t.value === e.tag)?.emoji} {e.tag}
                  </span>
                )}
                <button
                  onClick={() => setView('journal')}
                  className="opacity-0 group-hover:opacity-100 text-muted/30 hover:text-navy transition-all flex-shrink-0"
                  title="去流水账编辑"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            ))}
            {entries.length === 0 && <p className="text-sm text-muted">暂无记录。去「对话」页记第一条吧。</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function GaugeCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <p className="text-xs text-muted mb-3 font-mono tracking-wider uppercase">{label}</p>
      <div className="flex items-end gap-2 mb-2">
        <span className="font-serif text-4xl text-navy">{value}</span>
        <span className="text-sm text-muted pb-1">/100</span>
      </div>
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-muted/60 tracking-wider uppercase">{label}</p>
      <p className="font-serif text-2xl text-navy mt-0.5">{value}</p>
    </div>
  )
}
