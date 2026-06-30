// ── 前端 SSE 客户端：消费服务端 /api/chat 流式响应 ──
export interface StreamEventText {
  type: 'text';
  text: string;
}

export interface StreamEventThinkingStart {
  type: 'thinking_start';
}

export interface StreamEventThinking {
  type: 'thinking';
  text: string;
}

export interface StreamEventDone {
  type: 'done';
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}

export interface StreamEventError {
  type: 'error';
  message: string;
  errorType: string;
}

export type StreamEvent =
  | StreamEventText
  | StreamEventThinkingStart
  | StreamEventThinking
  | StreamEventDone
  | StreamEventError;

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  contextBlock?: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

/**
 * 流式聊天：POST /api/chat，返回 SSE 事件的 AsyncGenerator
 * 支持 AbortController 取消
 */
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    yield {
      type: 'error',
      message: `服务器错误 (${response.status}): ${text}`,
      errorType: 'http_error',
    };
    return;
  }

  if (!response.body) {
    yield { type: 'error', message: '响应体为空', errorType: 'empty_body' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const event = JSON.parse(data) as StreamEvent;
            yield event;
          } catch {
            // 心跳注释行，跳过
          }
        }
      }
    }

    // 处理残留 buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        try {
          yield JSON.parse(data) as StreamEvent;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
