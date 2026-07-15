// ── 前端 SSE 客户端：消费后端 /api/chat 流式响应 ──
// 架构：浏览器 → HF Spaces（server/index.ts）→ DeepSeek API
// API Key 在后端环境变量中，前端完全不可见

export interface StreamEventText {
  type: 'text';
  text: string;
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
  | StreamEventThinking
  | StreamEventDone
  | StreamEventError;

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  contextBlock?: string;
}

/** 获取后端 API 基础地址（localStorage > 环境变量 > 默认 HF Spaces） */
export function getApiBase(): string {
  try {
    const stored = localStorage.getItem('ywe_api_base');
    if (stored) return stored;
  } catch { /* localStorage 不可用 */ }
  return (import.meta as any).env?.VITE_API_BASE_URL || '/api';
}

/** 设置后端 API 基础地址（持久化到 localStorage） */
export function setApiBase(url: string): void {
  try {
    localStorage.setItem('ywe_api_base', url.replace(/\/+$/, ''));
  } catch { /* 不可用 */ }
}

/** 流式聊天：POST /api/chat，返回 SSE 事件的 AsyncGenerator */
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (fetchError: unknown) {
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
    yield {
      type: 'error',
      message: '无法连接后端服务。请点击右上角配置正确的后端地址。',
      errorType: 'network_error',
    };
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    yield {
      type: 'error',
      message: `服务器错误 (${response.status}): ${text.slice(0, 200)}`,
      errorType: 'http_error',
    };
    return;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    yield {
      type: 'error',
      message: `响应类型异常 (${contentType.slice(0, 50)})——请确认后端地址正确指向 API 服务。`,
      errorType: 'bad_response',
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

    if (buffer.trim().startsWith('data: ')) {
      const data = buffer.trim().slice(6);
      try { yield JSON.parse(data) as StreamEvent; } catch { /* ignore */ }
    }
  } finally {
    reader.releaseLock();
  }
}
