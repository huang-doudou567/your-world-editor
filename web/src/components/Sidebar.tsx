import { useUIStore, type ViewMode } from '../stores/ui-store'
import { useChatStore } from '../stores/chat-store'
import { clearAll } from '../data/db'
import { useJournalStore } from '../stores/journal-store'
import { usePatternStore } from '../stores/pattern-store'
import { useStoryStore } from '../stores/story-store'
import { seedIfFirstVisit } from '../data/seed'
import { MessageCircle, LayoutDashboard, NotebookPen, Radar, BookOpen, Compass, Settings, History, HelpCircle } from 'lucide-react'

const navItems: { view: ViewMode; label: string; icon: typeof MessageCircle }[] = [
  { view: 'chat', label: '对话', icon: MessageCircle },
  { view: 'dashboard', label: '看板', icon: LayoutDashboard },
  { view: 'journal', label: '流水账', icon: NotebookPen },
  { view: 'recall', label: '回忆', icon: History },
  { view: 'patterns', label: '模式', icon: Radar },
  { view: 'story', label: '我的故事', icon: BookOpen },
  { view: 'simulate', label: '决策推演', icon: Compass },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, setView } = useUIStore()
  const clearMessages = useChatStore(s => s.clearMessages)
  const refreshJournal = useJournalStore(s => s.refresh)
  const refreshPatterns = usePatternStore(s => s.refresh)
  const refreshStory = useStoryStore(s => s.refresh)

  const handleReset = async () => {
    if (!confirm('确定清空所有数据并重置演示数据？此操作不可撤销。')) return
    await clearAll()
    clearMessages()
    await seedIfFirstVisit()
    await Promise.all([refreshJournal(), refreshPatterns(), refreshStory()])
  }

  return (
    <>
      {open && <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      <aside className={`
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:static inset-y-0 left-0 z-50
        w-56 bg-navy text-cream flex flex-col
        transition-transform duration-200
      `}>
        <div className="p-5 border-b border-white/10">
          <h2 className="font-serif text-xl tracking-wide">你的世界<br/>编辑器</h2>
          <p className="text-[10px] tracking-[.2em] uppercase text-white/30 mt-1">Self-Cognition OS</p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ view: v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => { setView(v); onClose() }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm tracking-wide transition-colors
                ${view === v ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => { setView('guide'); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <HelpCircle size={14} />
            使用指南
          </button>
          <button
            onClick={() => { setView('onboarding'); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Settings size={14} />
            重新引导
          </button>
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors"
          >
            重置演示数据
          </button>
        </div>
      </aside>
    </>
  )
}
