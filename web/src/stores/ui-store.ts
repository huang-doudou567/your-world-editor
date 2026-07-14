import { create } from 'zustand';

export type ViewMode = 'chat' | 'dashboard' | 'analysis' | 'journal' | 'patterns' | 'story' | 'simulate' | 'recall' | 'onboarding' | 'guide';

interface UIState {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'chat',
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
}));
