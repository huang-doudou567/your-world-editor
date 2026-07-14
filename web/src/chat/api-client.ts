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

/** 获取 API 基础地址（优先级：localStorage > 环境变量 > 默认 /api） */
export function getApiBase(): string {
  try {
    const stored = localStorage.getItem('ywe_api_base');
    if (stored) return stored;
  } catch { /* localStorage 不可用 */ }
  return (import.meta as any).env?.VITE_API_BASE_URL || '/api';
}

/** 设置 API 基础地址（持久化到 localStorage） */
export function setApiBase(url: string): void {
  try {
    localStorage.setItem('ywe_api_base', url);
  } catch { /* localStorage 不可用 */ }
}

/**
 * 流式聊天：POST /api/chat，返回 SSE 事件的 AsyncGenerator
 * 支持 AbortController 取消
 */
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
    if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
      yield {
        type: 'error',
        message: '无法连接到后端服务。Render 服务可能已休眠或未部署。',
        errorType: 'network_error',
      };
    } else if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
      // 用户主动取消，不报错
      return;
    } else {
      yield {
        type: 'error',
        message: `网络错误: ${fetchError instanceof Error ? fetchError.message : '未知错误'}`,
        errorType: 'network_error',
      };
    }
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    yield {
      type: 'error',
      message: `服务器错误 (${response.status}): ${text.slice(0, 200)}`,
      errorType: 'http_error',
    };
    return;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream') && !contentType.includes('application/json')) {
    yield {
      type: 'error',
      message: '后端服务未部署或已休眠。请确认 Render 服务状态。',
      errorType: 'backend_unavailable',
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
