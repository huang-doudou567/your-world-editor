// ── 前端直连 DeepSeek API（SSE 流式）—— 无需后端代理 ──
import { SYSTEM_PROMPT } from './system-prompt';

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

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

/** DeepSeek API Key（localStorage 持久化） */
export function getDeepSeekKey(): string {
  try {
    return localStorage.getItem('ywe_ds_key') || '';
  } catch { return ''; }
}

export function setDeepSeekKey(key: string): void {
  try {
    localStorage.setItem('ywe_ds_key', key);
  } catch { /* 不可用 */ }
}

/** 流式聊天：直连 DeepSeek API，返回 SSE 事件的 AsyncGenerator */
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  const apiKey = getDeepSeekKey();
  if (!apiKey) {
    yield {
      type: 'error',
      message: '请先设置 DeepSeek API Key。点击右上角「未设置Key」按钮输入。',
      errorType: 'no_key',
    };
    return;
  }

  // 构建 OpenAI-compatible messages：系统提示词 + 上下文 + 对话历史
  const apiMessages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (request.contextBlock) {
    apiMessages.push({ role: 'system', content: request.contextBlock });
  }

  for (const msg of request.messages) {
    apiMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  let response: Response;
  try {
    response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        max_tokens: 4096,
        stream: true,
      }),
      signal,
    });
  } catch (fetchError: unknown) {
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
    yield {
      type: 'error',
      message: `网络错误: ${fetchError instanceof Error ? fetchError.message : '连接失败'}`,
      errorType: 'network_error',
    };
    return;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 401) {
      yield {
        type: 'error',
        message: 'API Key 无效，请检查后重新设置。',
        errorType: 'auth_error',
      };
    } else if (response.status === 402) {
      yield {
        type: 'error',
        message: 'DeepSeek 账户余额不足，请充值。',
        errorType: 'quota_error',
      };
    } else {
      yield {
        type: 'error',
        message: `API 错误 (${response.status}): ${text.slice(0, 150)}`,
        errorType: 'api_error',
      };
    }
    return;
  }

  if (!response.body) {
    yield { type: 'error', message: '响应体为空', errorType: 'empty_body' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;

          // DeepSeek-R1 思考过程
          if (delta?.reasoning_content) {
            yield { type: 'thinking', text: delta.reasoning_content };
          }

          // 正文
          if (delta?.content) {
            yield { type: 'text', text: delta.content };
          }

          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || 0;
            outputTokens = chunk.usage.completion_tokens || 0;
          }
        } catch {
          // 跳过无法解析的行（心跳等）
        }
      }
    }

    // 处理残留
    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const chunk = JSON.parse(buffer.trim().slice(6));
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) yield { type: 'text', text: delta.content };
      } catch { /* ignore */ }
    }
  } finally {
    reader.releaseLock();
  }

  yield {
    type: 'done',
    stop_reason: 'stop',
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  };
}
