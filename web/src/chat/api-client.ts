// ── SSE 客户端：消费后端 /api/chat 流式响应 ──
// 架构：浏览器 → Deno Deploy（后端代理，Key 存环境变量）→ DeepSeek API
// 用户也可设置自己的 Key 直连（右上角「未设Key」→ 输入自定义 Key）

import { SYSTEM_PROMPT } from './system-prompt';

export interface StreamEventText { type: 'text'; text: string; }
export interface StreamEventThinking { type: 'thinking'; text: string; }
export interface StreamEventDone { type: 'done'; stop_reason: string; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number; }; }
export interface StreamEventError { type: 'error'; message: string; errorType: string; }
export type StreamEvent = StreamEventText | StreamEventThinking | StreamEventDone | StreamEventError;

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  contextBlock?: string;
}

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEFAULT_BACKEND = 'https://happy-jaguar-1022.huang-doudou567.deno.net';

/** 获取后端 API 地址（localStorage > 默认 Deno） */
export function getApiBase(): string {
  try {
    const stored = localStorage.getItem('ywe_api_base');
    if (stored) return stored;
  } catch { /* 不可用 */ }
  return DEFAULT_BACKEND;
}

export function setApiBase(url: string): void {
  try { localStorage.setItem('ywe_api_base', url.replace(/\/+$/, '')); } catch { /* 不可用 */ }
}

/** API Key（直连模式使用） */
export function getApiKey(): string {
  try { return localStorage.getItem('ywe_ds_key') || ''; } catch { return ''; }
}
export function setApiKey(key: string): void {
  try { localStorage.setItem('ywe_ds_key', key); } catch { /* 不可用 */ }
}
export function hasCustomKey(): boolean {
  try { return !!localStorage.getItem('ywe_ds_key'); } catch { return false; }
}

/** 流式聊天：有自定义 Key 直连 DeepSeek，否则走后端代理 */
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, void, undefined> {
  const apiKey = getApiKey();

  // ── 有自定义 Key → 直连 DeepSeek ──
  if (apiKey) {
    const apiMessages: { role: string; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];
    if (request.contextBlock) apiMessages.push({ role: 'system', content: request.contextBlock });
    for (const msg of request.messages) {
      apiMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    }

    let response: Response;
    try {
      response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: apiMessages, max_tokens: 4096, stream: true }),
        signal,
      });
    } catch (fetchError: unknown) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
      yield { type: 'error', message: `网络错误: ${fetchError instanceof Error ? fetchError.message : '连接失败'}`, errorType: 'network_error' };
      return;
    }

    if (!response.ok) {
      if (response.status === 401) { yield { type: 'error', message: 'API Key 无效', errorType: 'auth_error' }; return; }
      if (response.status === 402) { yield { type: 'error', message: 'DeepSeek 余额不足', errorType: 'quota_error' }; return; }
      yield { type: 'error', message: `API 错误 (${response.status})`, errorType: 'api_error' }; return;
    }

    if (!response.body) { yield { type: 'error', message: '响应体为空', errorType: 'empty_body' }; return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', inputTokens = 0, outputTokens = 0;

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
            if (delta?.reasoning_content) yield { type: 'thinking', text: delta.reasoning_content };
            if (delta?.content) yield { type: 'text', text: delta.content };
            if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens || 0; outputTokens = chunk.usage.completion_tokens || 0; }
          } catch { /* skip */ }
        }
      }
    } finally { reader.releaseLock(); }

    yield { type: 'done', stop_reason: 'stop', usage: { input_tokens: inputTokens, output_tokens: outputTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } };
    return;
  }

  // ── 无自定义 Key → 走 Deno 后端代理 ──
  const base = getApiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (fetchError: unknown) {
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
    yield { type: 'error', message: '无法连接后端服务，请稍后重试。', errorType: 'network_error' };
    return;
  }

  if (!response.ok) {
    yield { type: 'error', message: `服务器错误 (${response.status})`, errorType: 'http_error' };
    return;
  }

  if (!response.body) { yield { type: 'error', message: '响应体为空', errorType: 'empty_body' }; return; }

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
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (!data) continue;
        try { yield JSON.parse(data) as StreamEvent; } catch { /* 心跳 */ }
      }
    }
  } finally { reader.releaseLock(); }
}
