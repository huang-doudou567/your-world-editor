import { create } from 'zustand';
import type { ChatMessage, SuggestedRecord } from '../engine/types';
import { streamChat } from '../chat/api-client';
import { buildContextData, formatContextBlock } from '../chat/context-builder';
import { assessRecordWorthiness, classifyEmotion } from '../engine/event-intake';
import { useJournalStore } from './journal-store';
import { usePatternStore } from './pattern-store';
import { useStoryStore } from './story-store';

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

  // 标签映射
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

  return {
    record: { title, tag, emotion },
    cleanContent,
  };
}

interface ChatState {
  messages: ChatMessage[];
  input: string;
  isStreaming: boolean;
  streamingId: string | null;
  abortController: AbortController | null;
  nickname: string;
  setInput: (v: string) => void;
  setNickname: (v: string) => void;
  send: () => Promise<void>;
  stopGenerating: () => void;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  recordUserMessage: (messageId: string) => void;
  saveSuggestedRecord: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  input: '',
  isStreaming: false,
  streamingId: null,
  abortController: null,
  nickname: '',

  setInput: (v) => set({ input: v }),
  setNickname: (v) => set({ nickname: v }),

  send: async () => {
    const { input, messages, isStreaming, nickname } = get();
    if (!input.trim() || isStreaming) return;

    // ── 本地信号评分：检测高价值内容 ──
    const intake = assessRecordWorthiness(input);

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      // 4-7 分建议记录，≥8 分自动记录
      suggestedRecord: intake.worthRecording && intake.score >= 4 && intake.score < 8
        ? {
            title: intake.extractedTitle,
            tag: intake.suggestedTag || '',
            emotion: classifyEmotion(input).emotion,
          }
        : undefined,
    };

    // ── ≥8 分：自动写入流水账 ──
    if (intake.worthRecording && intake.score >= 8) {
      const emotion = classifyEmotion(input);
      useJournalStore.getState().addEntry({
        timestamp: now(),
        tag: (intake.suggestedTag || '') as any,
        mode: intake.suggestedMode as any || '',
        emotion: emotion.emotion,
        title: intake.extractedTitle,
        text: input,
        source: 'free_text',
        patternRefs: [],
        confidence: 'high',
        grounded: true,
        merged: false,
      });
      userMsg.recordSaved = true;
    }

    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'system',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    const abortController = new AbortController();

    set({
      messages: [...messages, userMsg, assistantMsg],
      input: '',
      isStreaming: true,
      streamingId: assistantId,
      abortController,
    });

    try {
      const entries = useJournalStore.getState().entries;
      const patterns = usePatternStore.getState().patterns;
      const story = useStoryStore.getState().sections;

      const ctxData = buildContextData({ entries, patterns, story, nickname });
      const contextBlock = formatContextBlock(ctxData);

      const history = get().messages.filter(
        (m) => !m.isStreaming && m.role !== 'system',
      );

      const apiMessages = history
        .filter((m) => m.role === 'user' || m.role === 'ai')
        .map((m) => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        }));

      for await (const event of streamChat(
        { messages: apiMessages, contextBlock },
        abortController.signal,
      )) {
        if (abortController.signal.aborted) break;

        const current = get().messages.find((m) => m.id === assistantId);
        if (!current) break;

        switch (event.type) {
          case 'text':
            set({
              messages: get().messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text }
                  : m,
              ),
            });
            break;

          case 'thinking':
            set({
              messages: get().messages.map((m) =>
                m.id === assistantId
                  ? { ...m, thinking: (m.thinking || '') + event.text }
                  : m,
              ),
            });
            break;

          case 'done': {
            // ── 解析 AI 回复中的记录建议标记 ──
            const finalContent = get().messages.find((m) => m.id === assistantId)?.content || '';
            const parsed = parseRecordMarker(finalContent);

            set({
              messages: get().messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      isStreaming: false,
                      content: parsed ? parsed.cleanContent : m.content,
                      suggestedRecord: parsed?.record,
                      usage: event.usage,
                    }
                  : m,
              ),
              isStreaming: false,
              streamingId: null,
              abortController: null,
            });
            return;
          }

          case 'error':
            set({
              messages: get().messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      isStreaming: false,
                      error: event.message,
                      content: m.content || '（回复失败）',
                    }
                  : m,
              ),
              isStreaming: false,
              streamingId: null,
              abortController: null,
            });
            return;
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        set({
          messages: get().messages.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, content: m.content || '（已停止生成）' }
              : m,
          ),
          isStreaming: false,
          streamingId: null,
          abortController: null,
        });
        return;
      }

      const errorMsg = err instanceof Error ? err.message : '连接失败';
      set({
        messages: get().messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                isStreaming: false,
                error: errorMsg,
                content: m.content || '（回复失败）',
              }
            : m,
        ),
        isStreaming: false,
        streamingId: null,
        abortController: null,
      });
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
      if (messages[i].role === 'user') {
        lastUserMsg = messages[i];
        break;
      }
    }
    if (!lastUserMsg) return;

    set({ messages: messages.filter((m) => m.id !== messageId) });
    set({ input: lastUserMsg.content });
    await get().send();
  },

  clearMessages: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({
      messages: [WELCOME_MESSAGE],
      isStreaming: false,
      streamingId: null,
      abortController: null,
    });
  },

  // ── 手动记录用户消息（悬停按钮）──
  recordUserMessage: (messageId: string) => {
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg || msg.role !== 'user') return;

    const intake = assessRecordWorthiness(msg.content);
    const emotion = classifyEmotion(msg.content);

    useJournalStore.getState().addEntry({
      timestamp: now(),
      tag: (intake.suggestedTag || '') as any,
      mode: intake.suggestedMode as any || '',
      emotion: emotion.emotion,
      title: intake.extractedTitle || msg.content.slice(0, 40),
      text: msg.content,
      source: 'free_text',
      patternRefs: [],
      confidence: intake.score >= 8 ? 'high' : 'medium',
      grounded: true,
      merged: false,
    });

    set({
      messages: get().messages.map((m) =>
        m.id === messageId ? { ...m, recordSaved: true } : m,
      ),
    });
  },

  // ── 保存 AI 建议的记录 ──
  saveSuggestedRecord: (messageId: string) => {
    const msg = get().messages.find((m) => m.id === messageId);
    if (!msg?.suggestedRecord) return;

    const r = msg.suggestedRecord;
    // 找最近一条用户消息作为记录正文
    const msgIdx = get().messages.findIndex((m) => m.id === messageId);
    let userText = '';
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (get().messages[i].role === 'user') {
        userText = get().messages[i].content;
        break;
      }
    }

    useJournalStore.getState().addEntry({
      timestamp: now(),
      tag: r.tag as any,
      mode: '',
      emotion: r.emotion,
      title: r.title,
      text: userText || r.title,
      source: 'free_text',
      patternRefs: [],
      confidence: 'medium',
      grounded: true,
      merged: false,
    });

    set({
      messages: get().messages.map((m) =>
        m.id === messageId ? { ...m, recordSaved: true, suggestedRecord: undefined } : m,
      ),
    });
  },
}));
