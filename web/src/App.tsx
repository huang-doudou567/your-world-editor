import { useEffect } from 'react'
import { useJournalStore } from './stores/journal-store'
import { usePatternStore } from './stores/pattern-store'
import { useStoryStore } from './stores/story-store'
import { useUIStore } from './stores/ui-store'
import { seedIfFirstVisit } from './data/seed'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import Dashboard from './components/Dashboard'
import JournalList from './components/JournalList'
import PatternList from './components/PatternList'
import StoryView from './components/StoryView'
import DecisionSim from './components/DecisionSim'
import OnboardingWizard from './components/OnboardingWizard'
import RecallTimeline from './components/RecallTimeline'
import UserGuide from './components/UserGuide'

export default function App() {
  const refreshJournal = useJournalStore(s => s.refresh)
  const refreshPatterns = usePatternStore(s => s.refresh)
  const refreshStory = useStoryStore(s => s.refresh)
  const { view, sidebarOpen, toggleSidebar } = useUIStore()
  const entriesLoading = useJournalStore(s => s.loading)

  useEffect(() => {
    Promise.resolve()
      .then(() => seedIfFirstVisit())
      .then(() => { refreshJournal(); refreshPatterns(); refreshStory(); })
      .catch(() => { refreshJournal(); refreshPatterns(); refreshStory(); })
  }, [])

  if (entriesLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="font-serif text-3xl text-navy mb-3">你的世界编辑器</p>
          <p className="text-muted text-sm flex items-center gap-1 justify-center">
            加载中
            <span className="animate-pulse-dot">.</span>
            <span className="animate-pulse-dot">.</span>
            <span className="animate-pulse-dot">.</span>
          </p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard />
      case 'journal': return <JournalList />
      case 'patterns': return <PatternList />
      case 'story': return <StoryView />
      case 'simulate': return <DecisionSim />
      case 'onboarding': return <OnboardingWizard />
      case 'recall': return <RecallTimeline />
      case 'guide': return <UserGuide />
      default: return <ChatView />
    }
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-cream">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-navy text-cream">
        <button onClick={toggleSidebar} className="text-cream text-xl">☰</button>
        <span className="font-serif text-lg">你的世界编辑器</span>
        <span className="w-6" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => toggleSidebar()} />

      <main className="flex-1 overflow-hidden flex flex-col">
        {renderView()}
      </main>
    </div>
  )
}
