import { create } from 'zustand';
import type { ChatMessage, Event, Pattern } from '../engine/types';
import { routeMessage } from '../chat/engine';
import { useJournalStore } from './journal-store';
import { usePatternStore } from './pattern-store';
import { useStoryStore } from './story-store';

interface ChatState {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  clearMessages: () => void;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: uid(),
      role: 'system' as const,
      content: '你好！我是你的世界编辑器。\n\n你可以试试：\n📝 说「记一下，今天…」记录一条流水账\n🔍 说「上次我跟…」检索回忆\n🧭 说「推演一下」让系统帮你推演人生路径\n🪞 说「照镜子」做一次周复盘\n🎨 说「我这周住在哪个窗格」看情绪分布\n\n或者，说「搭建」开始 7 步引导。',
      timestamp: new Date().toISOString(),
      thinking: ['→ 系统就绪', '→ 五层架构已加载', '→ 等待用户输入...'],
    },
  ],
  input: '',
  setInput: (v) => set({ input: v }),
  send: () => {
    const { input, messages } = get();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const entries = useJournalStore.getState().entries;
    const patterns = usePatternStore.getState().patterns;
    const story = useStoryStore.getState().sections;

    const ctx = {
      entries,
      patterns,
      story,
      onSaveEntry: (e: Event) => useJournalStore.getState().addEntry(e),
      onSavePattern: (p: Pattern) => usePatternStore.getState().addPattern(p),
    };

    const reply = routeMessage(input, ctx);

    if (reply) {
      set({
        messages: [...messages, userMsg, reply],
        input: '',
      });
    }
  },
  clearMessages: () => set({ messages: [] }),
}));
