import { usePatternStore } from '../stores/pattern-store'

export default function PatternList() {
  const { patterns } = usePatternStore()

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">模式与盲点</p>
        <p className="text-xs text-muted mt-0.5">已识别 {patterns.length} 个行为模式</p>
      </div>
      <div className="p-6 max-w-3xl space-y-6">
        {patterns.filter(p => p.type === 'blind_spot').map(p => (
          <div key={p.id || p.name} className="bg-white border border-line rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">⚠️</span>
              <h3 className="font-serif text-lg text-navy">{p.name}</h3>
              <span className="text-[10px] font-mono text-red-400/60 ml-auto">盲区</span>
            </div>
            <div className="space-y-2 text-sm text-muted">
              <p><span className="text-navy text-xs font-mono">触发：</span>{p.trigger}</p>
              <p><span className="text-navy text-xs font-mono">核心：</span>{p.core}</p>
              <p><span className="text-navy text-xs font-mono">对策：</span>{p.countermeasure}</p>
            </div>
            {p.cases.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-xs font-mono text-muted/60 mb-2">案例日志</p>
                {p.cases.map((c, i) => (
                  <div key={i} className="text-xs text-muted py-1 flex items-start gap-2">
                    <span>{c.symbol}</span>
                    <span>{c.timestamp.slice(0, 10)}</span>
                    <span>{c.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {patterns.filter(p => p.type === 'positive').map(p => (
          <div key={p.id || p.name} className="bg-white border border-line rounded-xl p-6 border-l-4 border-l-gold">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">✨</span>
              <h3 className="font-serif text-lg text-navy">{p.name}</h3>
              <span className="text-[10px] font-mono text-gold/60 ml-auto">正向模式</span>
            </div>
            <div className="space-y-2 text-sm text-muted">
              <p><span className="text-navy text-xs font-mono">触发：</span>{p.trigger}</p>
              <p><span className="text-navy text-xs font-mono">核心：</span>{p.core}</p>
            </div>
            {p.cases.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line">
                {p.cases.map((c, i) => (
                  <div key={i} className="text-xs text-muted py-1">✅ {c.timestamp.slice(0, 10)} · {c.description}</div>
                ))}
              </div>
            )}
          </div>
        ))}
        {patterns.length === 0 && (
          <p className="text-center text-muted py-12">暂无已识别的模式。随着记录积累，系统会自动发现行为规律。</p>
        )}
      </div>
    </div>
  )
}
