import { create } from 'zustand';
import type { Pattern } from '../engine/types';
import { loadPatterns, savePattern } from '../data/db';

interface PatternState {
  patterns: Pattern[];
  loading: boolean;
  refresh: () => Promise<void>;
  addPattern: (p: Pattern) => Promise<void>;
}

export const usePatternStore = create<PatternState>((set, get) => ({
  patterns: [],
  loading: true,
  refresh: async () => {
    const patterns = await loadPatterns();
    set({ patterns, loading: false });
  },
  addPattern: async (p) => {
    await savePattern(p);
    await get().refresh();
  },
}));
