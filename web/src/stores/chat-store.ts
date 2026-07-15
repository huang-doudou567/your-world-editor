import { create } from 'zustand';
import type { ChatMessage, SuggestedRecord } from '../engine/types';
import { streamChat } from '../chat/api-client';
import { buildContextData, formatContextBlock } from '../chat/context-builder';
import { assessRecordWorthiness, classifyEmotion } from '../engine/event-intake';
import { useJournalStore } from './journal-store';
import { usePatternStore } from './pattern-store';
import { useStoryStore } from './story-store';
import { loadChatMessages, saveChatMessages, type PersistedMessage } from '../data/db';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

const WELCOME_MESSAGE: ChatMessage = {
  id: uid(),
  role: 'system' as const,
  content: '你好！我是你的世界编辑器。\n\n你可以试试：\n📝 说「记一下，今天…」记录一条流水账\n🔍 说「上次我跟…」检索回忆\n🧭 说「推演一下」让系统帮你推演人生路径\n🪞 说「照镜子」做一次周复盘\n🎨 说「我这周住在哪个窗格」看情绪分布\n\n或者，说「搭建」开始 7 步引导。',
  timestamp: new Date().toISOString(),
};

// ── 初始 messages：优先从 localStorage 恢复 ──
async function loadInitialMessages(): Promise<ChatMessage[]> {
  try {
    const saved = await loadChatMessages();
    if (saved.length > 0) return saved as ChatMessage[];
  } catch { /* ignore */ }
  // 首次访问 → 追加欢迎消息并立即持久化
  const wm = { ...WELCOME_MESSAGE };
  saveChatMessages([wm as PersistedMessage]).catch(() => {});
  return [wm];
}

// ── 持久化 messages 到 localStorage ──
function persistMessages(messages: ChatMessage[]): void {
  const toSave: PersistedMessage[] = messages
    .filter(m => !m.isStreaming || (m.role !== 'ai'))
    .map(({ isStreaming, ...rest }) => rest);
  saveChatMessages(toSave).catch(() => {});
}

// ── 解析 AI 回复中的 [建议记录: 标题 | 标签 | 情绪] 标记 ──
function parseRecordMarker(content: string): { record: SuggestedRecord; cleanContent: string } | null {
  const re = /\[建议记录:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(🎨彩色|💡明亮|🌑黑暗)\s*\]/;
  const match = content.match(re);
  if (!match) return null;

  const title = match[1].trim();
  const tagRaw = match[2].trim();
  const emoji = match[3];
  const emotion = emoji.includes('彩色') ? 'colorful' as const
    : emoji.includes('黑暗') ? 'dark' as const
    : 'bright' as const;

  const tagMap: Record<string, string> = {
    '决策': '决策', '模式': '模式', '洞察': '洞察',
    '工作事业': '工作事业', '工作': '工作事业',
    '感情': '感情', '爱情': '感情',
    '健康': '健康', '身体': '健康',
    '财务': '财务', '理财': '财务',
    '梦境': '梦境', '梦': '梦境',
  };
  const tag = tagMap[tagRaw] || tagRaw || '';

  const cleanContent = content.replace(match[0], '').trim();

  return { record: { title, tag, emotion }, cleanContent };
}

interface ChatState {
  messages: ChatMessage[];
  input: string;
  isStreaming: boolean;
  streamingId: string | null;
  abortController: AbortController | null;
  nickname: string;
  /** 用户手动选取引用的 AI 回复文本（用于"选取引用"功能） */
  selectedQuote: string | null;
  setInput: (v: string) => void;
  setNickname: (v: string) => void;
  send: () => Promise<void>;
  stopGenerating: () => void;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  recordUserMessage: (messageId: string) => void;
  saveSuggestedRecord: (messageId: string) => void;
  /** 初始化加载 + 过期清理检查 */
  initMessages: () => Promise<void>;
  /** 手动选取 AI 回复文本引用为流水账记录 */
  quoteTextToJournal: (quotedText: string, sourceMsgId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  input: '',
  isStreaming: false,
  streamingId: null,
  abortController: null,
  nickname: '',
  selectedQuote: null,

  setInput: (v) => set({ input: v }),
  setNickname: (v) => set({ nickname: v }),

  // ── 初始化：从 localStorage 加载历史对话 ──
  initMessages: async () => {
    const msgs = await loadInitialMessages();
    set({ messages: msgs });
  },

  send: async () => {
    const { input, messages, isStreaming, nickname } = get();
    if (!input.trim() || isStreaming) return;

    const intake = assessRecordWorthiness(input);

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      suggestedRecord: intake.worthRecording && intake.score >= 4
        ? { title: intake.extractedTitle, tag: intake.suggestedTag || '', emotion: classifyEmotion(input).emotion }
        : undefined,
    };

    if (intake.worthRecording && intake.score >= 4) {
      const emotion = classifyEmotion(input);
      useJournalStore.getState().addEntry({
        timestamp: now(), tag: (intake.suggestedTag || '') as any,
        mode: intake.suggestedMode as any || '', emotion: emotion.emotion,
        title: intake.extractedTitle, text: input, source: 'free_text',
        patternRefs: [], confidence: intake.score >= 8 ? 'high' : 'medium',
        grounded: true, merged: false,
      });
      userMsg.recordSaved = true;
      usePatternStore.getState().refresh();
      useStoryStore.getState().refresh();
    }

    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId, role: 'ai', content: '',
      timestamp: new Date().toISOString(), isStreaming: true,
    };

    const abortController = new AbortController();
    const newMessages = [...messages, userMsg, assistantMsg];

    set({
      messages: newMessages, input: '', isStreaming: true,
      streamingId: assistantId, abortController,
    });
    persistMessages([...newMessages.slice(0, -1), { ...assistantMsg }]);

    try {
      const entries = useJournalStore.getState().entries;
      const patterns = usePatternStore.getState().patterns;
      const story = useStoryStore.getState().sections;

      const ctxData = buildContextData({ entries, patterns, story, nickname });
      const contextBlock = formatContextBlock(ctxData);

      const apiMessages = get().messages
        .filter((m) => !m.isStreaming && (m.role === 'user' || m.role === 'ai'))
        .map((m) => ({ role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.content }));

      for await (const event of streamChat({ messages: apiMessages, contextBlock }, abortController.signal)) {
        if (abortController.signal.aborted) break;
        const current = get().messages.find((m) => m.id === assistantId);
        if (!current) break;

        switch (event.type) {
          case 'text':
            set({
              messages: get().messages.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m),
            });
            break;
          case 'thinking':
            set({
              messages: get().messages.map((m) =>
                m.id === assistantId ? { ...m, thinking: (m.thinking || '') + event.text } : m),
            });
            break;
          case 'done': {
            const finalContent = get().messages.find((m) => m.id === assistantId)?.content || '';
            const parsed = parseRecordMarker(finalContent);
            const doneMsgs = get().messages.map((m) =>
              m.id === assistantId ? {
                ...m, isStreaming: false,
                content: parsed ? parsed.cleanContent : m.content,
                suggestedRecord: parsed?.record, usage: event.usage,
              } : m);
            set({ messages: doneMsgs, isStreaming: false, streamingId: null, abortController: null });
            persistMessages(doneMsgs);
            return;
          }
          case 'error':
            const errMsgs = get().messages.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false, error: event.message, content: m.content || '（回复失败）' } : m);
            set({ messages: errMsgs, isStreaming: false, streamingId: null, abortController: null });
            persistMessages(errMsgs);
            return;
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        const stoppedMsgs = get().messages.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false, content: m.content || '（已停止生成）' } : m);
        set({ messages: stoppedMsgs, isStreaming: false, streamingId: null, abortController: null });
        persistMessages(stoppedMsgs);
        return;
      }
      const errorMsg = err instanceof Error ? err.message : '连接失败';
      const failMsgs = get().messages.map((m) =>
        m.id === assistantId ? { ...m, isStreaming: false, error: errorMsg, content: m.content || '（回复失败）' } : m);
      set({ messages: failMsgs, isStreaming: false, streamingId: null, abortController: null });
      persistMessages(failMsgs);
    }
  },

  stopGenerating: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
  },

  retryMessage: async (messageId: string) => {
    const { messages } = get();
    const failedIdx = messages.findIndex((m) => m.id === messageId);
    if (failedIdx === -1) return;
    let lastUserMsg: ChatMessage | null = null;
    for (let i = failedIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserMsg = messages[i]; break; }
    }
    if (!lastUserMsg) return;
    set({ messages: messages.filter((m) => m.id !== messageId) });
    set({ input: lastUserMsg.content });
    await get().send();
  },

  clearMessages: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    const wm = { ...WELCOME_MESSAGE, timestamp: new Date().toISOString() };
    set({ messages: [wm], isStreaming: false, streamingId: null, abortController: null });
    persistMessages([wm]);
  },

  recordUserMessage: (messageId: string) => {
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg || msg.role !== 'user') return;
    const intake = assessRecordWorthiness(msg.content);
    const emotion = classifyEmotion(msg.content);
    useJournalStore.getState().addEntry({
      timestamp: now(), tag: (intake.suggestedTag || '') as any,
      mode: intake.suggestedMode as any || '', emotion: emotion.emotion,
      title: intake.extractedTitle || msg.content.slice(0, 40), text: msg.content,
      source: 'free_text', patternRefs: [],
      confidence: intake.score >= 8 ? 'high' : 'medium', grounded: true, merged: false,
    });
    const updated = get().messages.map((m) =>
      m.id === messageId ? { ...m, recordSaved: true } : m);
    set({ messages: updated });
    persistMessages(updated);
  },

  saveSuggestedRecord: (messageId: string) => {
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg?.suggestedRecord) return;
    const r = msg.suggestedRecord;
    const msgIdx = get().messages.findIndex((m) => m.id === messageId);
    let userText = '';
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (get().messages[i].role === 'user') { userText = get().messages[i].content; break; }
    }
    useJournalStore.getState().addEntry({
      timestamp: now(), tag: r.tag as any, mode: '', emotion: r.emotion,
      title: r.title, text: userText || r.title, source: 'free_text',
      patternRefs: [], confidence: 'medium', grounded: true, merged: false,
    });
    const updated = get().messages.map((m) =>
      m.id === messageId ? { ...m, recordSaved: true, suggestedRecord: undefined } : m);
    set({ messages: updated });
    persistMessages(updated);
  },

  // ── 手动选取 AI 回复文本引用为事件的附加记录 ──
  quoteTextToJournal: (quotedText: string, sourceMsgId: string) => {
    const sourceMsg = get().messages.find(m => m.id === sourceMsgId);
    if (!sourceMsg || !quotedText.trim()) return;

    // 找最近一条用户消息作为原始输入
    const sourceIdx = get().messages.findIndex(m => m.id === sourceMsgId);
    let userText = '';
    for (let i = sourceIdx - 1; i >= 0; i--) {
      const m = get().messages[i];
      if (m.role === 'user') { userText = m.content; break; }
    }

    const intake = assessRecordWorthiness(userText || quotedText);
    const emotion = classifyEmotion(quotedText);

    // 创建流水账条目：用户原文 + 引用 AI 回复作为附加记录
    const fullText = userText
      ? `${userText}\n\n📌 引用回复：${quotedText.slice(0, 300)}${quotedText.length > 300 ? '…' : ''}`
      : `📌 引用回复：${quotedText.slice(0, 300)}${quotedText.length > 300 ? '…' : ''}`;

    useJournalStore.getState().addEntry({
      timestamp: now(), tag: (intake.suggestedTag || '') as any,
      mode: intake.suggestedMode as any || '', emotion: emotion.emotion,
      title: intake.extractedTitle || quotedText.slice(0, 40),
      text: fullText, source: 'quote_selection',
      patternRefs: [], confidence: 'medium', grounded: true, merged: false,
    });

    // 标记消息已引用
    const updated = get().messages.map(m =>
      m.id === sourceMsgId ? { ...m, quotedRef: quotedText.slice(0, 120) } : m);
    set({ messages: updated, selectedQuote: null });
    persistMessages(updated);

    // 同步刷新
    usePatternStore.getState().refresh();
    useStoryStore.getState().refresh();
  },
}));
