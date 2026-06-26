import { create } from 'zustand';
import type { StorySection } from '../engine/types';
import { loadStory, saveStory } from '../data/db';

interface StoryState {
  sections: StorySection[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateSections: (s: StorySection[]) => Promise<void>;
}

export const useStoryStore = create<StoryState>((set) => ({
  sections: [],
  loading: true,
  refresh: async () => {
    const sections = await loadStory();
    set({ sections, loading: false });
  },
  updateSections: async (s) => {
    await saveStory(s);
    set({ sections: s });
  },
}));
