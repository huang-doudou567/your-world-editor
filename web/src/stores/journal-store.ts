import { create } from 'zustand';
import type { Event } from '../engine/types';
import { loadJournal, saveEntry, deleteEntry as dbDeleteEntry } from '../data/db';

interface JournalState {
  entries: Event[];
  loading: boolean;
  refresh: () => Promise<void>;
  addEntry: (e: Event) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateEntry: (e: Event) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  loading: true,
  refresh: async () => {
    const entries = await loadJournal();
    set({ entries, loading: false });
  },
  addEntry: async (e) => {
    await saveEntry(e);
    await get().refresh();
  },
  removeEntry: async (id) => {
    await dbDeleteEntry(id);
    await get().refresh();
  },
  updateEntry: async (e) => {
    await saveEntry(e);
    await get().refresh();
  },
}));
