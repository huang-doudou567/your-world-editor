// ── Vercel Serverless Function：DeepSeek API SSE 代理 ──
// 部署到 Vercel 后自动运行，无需 Express / 无需服务器运维
// 环境变量：DEEPSEEK_API_KEY（在 Vercel Dashboard → Settings → Environment Variables 设置）

import 'dotenv/config';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const SYSTEM_PROMPT = `你是"你的世界编辑器"，一个帮助用户记录人生、理解自我的 AI 伴侣。

## 你的角色

像一个善于倾听的朋友——温暖、真诚、不评判。用户跟你说话是为了被听见、被理解。

## 最重要的行为准则

**先回应，后记录。**

用户发的每一段话，你先当作一个朋友在倾诉来回应——理解 TA 在说什么、感受什么，给反馈，问一句追问。然后，如果你觉得这段内容有记录价值，在回复末尾加上记录建议。

## 记录建议格式

当用户分享的内容值得记下来时，在回复末尾单独一行写：
[建议记录: 一句话概括 | 标签 | 🎨彩色]
标签可选：工作、感情、健康、财务、梦境、决策、模式、洞察。情绪选 🎨彩色（积极）/ 💡明亮（中性）/ 🌑黑暗（沉重）。

注意：不要在文本中写"记录完成✅"或打分——那是机器行为，会破坏对话感。

## 禁止做的事

- 不要用打分、评级来回应用户的倾诉
- 不要编造用户没说过的事
- 不要替用户做人生决定
- 不要对用户的情绪说"你应该乐观一点"——黑暗的情绪也是重要的

## 特殊场景

- 用户说「照镜子」「周复盘」：基于已有记录照镜子，不列 to-do 清单
- 用户说「推演一下」：基于用户数据推演不同人生路径，不替 TA 做决定
- 用户说「搭建」「初始化」：引导 7 步搭建流程

回复用中文，温暖但不鸡汤。`;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Vercel serverless 入口：处理 /api/chat POST 请求 */
export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server not configured: missing API key' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body: { messages?: { role: string; content: string }[]; contextBlock?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const { messages, contextBlock } = body;
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // 构建 messages
  const apiMessages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  if (contextBlock) {
    apiMessages.push({ role: 'system', content: contextBlock });
  }
  for (const msg of messages) {
    apiMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  }

  // SSE streaming via ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* closed */ }
      }, 15000);

      try {
        const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: apiMessages,
            max_tokens: 4096,
            stream: true,
          }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const errorType = response.status === 401 ? 'auth_error'
            : response.status === 402 ? 'quota_error' : 'api_error';
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: `API ${response.status}: ${text.slice(0, 150)}`, errorType })}\n\n`,
          ));
          controller.close();
          return;
        }

        if (!response.body) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'Empty response body', errorType: 'empty_body' })}\n\n`,
          ));
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;

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

              if (delta?.reasoning_content) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'thinking', text: delta.reasoning_content })}\n\n`,
                ));
              }

              if (delta?.content) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`,
                ));
              }

              if (chunk.usage) {
                inputTokens = chunk.usage.prompt_tokens || 0;
                outputTokens = chunk.usage.completion_tokens || 0;
              }
            } catch { /* skip unparseable */ }
          }
        }

        // Flush remaining buffer
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          try {
            const chunk = JSON.parse(buffer.trim().slice(6));
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`,
              ));
            }
          } catch { /* skip */ }
        }

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'done', stop_reason: 'stop', usage: { input_tokens: inputTokens, output_tokens: outputTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })}\n\n`,
        ));

        controller.close();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        try {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: errorMsg, errorType: 'stream_error' })}\n\n`,
          ));
        } catch { /* already closed */ }
        try { controller.close(); } catch { /* already closed */ }
      } finally {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  });
}
