// ── Cloudflare Worker：DeepSeek API SSE 代理 ──
// 部署方式：Cloudflare Dashboard → Workers & Pages → Create → 粘贴此文件 → Deploy
// 环境变量：在 Worker Settings → Variables 中添加 DEEPSEEK_API_KEY

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

const SYSTEM_PROMPT = `你是"你的世界编辑器"，一个帮助用户记录人生、理解自我的 AI 伴侣。

像一个善于倾听的朋友——温暖、真诚、不评判。用户跟你说话是为了被听见、被理解。

最重要的行为准则：先回应，后记录。
用户发的每一段话，先当作朋友在倾诉来回应——理解 TA 在说什么、感受什么，给反馈，追问一句。
然后，如果觉得有记录价值，在回复末尾加上记录建议格式：
[建议记录: 一句话概括 | 标签 | 🎨彩色]
标签可选：工作、感情、健康、财务、梦境、决策、模式、洞察。情绪选 🎨彩色（积极）/ 💡明亮（中性）/ 🌑黑暗（沉重）。

注意：不要写"记录完成✅"或打分——那是机器行为，会破坏对话感。

禁止：打分评级回应用户、编造没说过的事、替人做人生决定、对用户说"你应该乐观一点"——黑暗的情绪也是重要的。

特殊场景：照镜子/周复盘只照镜子不列to-do；推演一下同时推演多条路径不替决定；搭建/初始化引导7步搭建流程。

回复用中文，温暖但不鸡汤。`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // /api/health
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', model: 'deepseek-chat', provider: 'cloudflare' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // /api/chat
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const apiKey = env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server not configured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const { messages, contextBlock } = body;
      if (!messages?.length) {
        return new Response(JSON.stringify({ error: 'messages required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
      if (contextBlock) apiMessages.push({ role: 'system', content: contextBlock });
      for (const msg of messages) {
        apiMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      }

      // SSE streaming via ReadableStream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const heartbeat = setInterval(() => {
            try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch {}
          }, 15000);

          try {
            const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({ model: 'deepseek-chat', messages: apiMessages, max_tokens: 4096, stream: true }),
            });

            if (!res.ok) {
              const text = await res.text().catch(() => '');
              const errorType = res.status === 401 ? 'auth_error' : res.status === 402 ? 'quota_error' : 'api_error';
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'error', message: `API ${res.status}: ${text.slice(0, 150)}`, errorType })}\n\n`
              ));
              controller.close();
              return;
            }

            if (!res.body) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'error', message: 'Empty body', errorType: 'empty_body' })}\n\n`
              ));
              controller.close();
              return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '', inputTokens = 0, outputTokens = 0;

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
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', text: delta.reasoning_content })}\n\n`));
                  }
                  if (delta?.content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`));
                  }
                  if (chunk.usage) {
                    inputTokens = chunk.usage.prompt_tokens || 0;
                    outputTokens = chunk.usage.completion_tokens || 0;
                  }
                } catch {}
              }
            }

            if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
              try {
                const chunk = JSON.parse(buffer.trim().slice(6));
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`));
              } catch {}
            }

            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'done', stop_reason: 'stop', usage: { input_tokens: inputTokens, output_tokens: outputTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })}\n\n`
            ));
            controller.close();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown';
            try { controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: msg, errorType: 'stream_error' })}\n\n`
            )); } catch {}
            try { controller.close(); } catch {}
          } finally {
            clearInterval(heartbeat);
          }
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
