// ── Deno Deploy 代理：DeepSeek API SSE → 自定义格式转换 ──
// 部署：Deno Deploy → New Playground → 粘贴此代码 → Save & Deploy
// 环境变量：Settings → Environment Variables → DEEPSEEK_API_KEY

const API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";
const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是"你的世界编辑器"，一个帮助用户记录人生、理解自我的 AI 伴侣。像一个善于倾听的朋友——温暖、真诚、不评判。先回应，后记录。回复用中文，温暖但不鸡汤。`;

Deno.serve(async (req) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers });

  const url = new URL(req.url);
  if (url.pathname === "/api/health") return new Response(JSON.stringify({ status: "ok" }), { headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method !== "POST" || url.pathname !== "/api/chat") return new Response("Not Found", { status: 404, headers });

  if (!API_KEY) return new Response(JSON.stringify({ error: "请在 Deno 项目 Settings → Environment Variables 添加 DEEPSEEK_API_KEY" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });

  const { messages, contextBlock } = await req.json();
  const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
  if (contextBlock) apiMessages.push({ role: "system", content: contextBlock });
  for (const m of messages) apiMessages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });

  // 调用 DeepSeek API（流式）
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: apiMessages, max_tokens: 4096, stream: true }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const errorType = res.status === 401 ? "auth_error" : res.status === 402 ? "quota_error" : "api_error";
    return new Response(`data: ${JSON.stringify({ type: "error", message: `API ${res.status}: ${text.slice(0, 150)}`, errorType })}\n\n`, {
      status: 200, headers: { "Content-Type": "text/event-stream", ...headers },
    });
  }
  if (!res.body) {
    return new Response(`data: ${JSON.stringify({ type: "error", message: "Empty response", errorType: "empty_body" })}\n\n`, {
      status: 200, headers: { "Content-Type": "text/event-stream", ...headers },
    });
  }

  // 转换 DeepSeek SSE → 自定义 SSE 格式
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", inputTokens = 0, outputTokens = 0;
    const heartbeat = setInterval(() => { try { writer.write(encoder.encode(": heartbeat\n\n")); } catch { /* closed */ } }, 15000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              writer.write(encoder.encode(`data: ${JSON.stringify({ type: "thinking", text: delta.reasoning_content })}\n\n`));
            }
            if (delta?.content) {
              writer.write(encoder.encode(`data: ${JSON.stringify({ type: "text", text: delta.content })}\n\n`));
            }
            if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens || 0; outputTokens = chunk.usage.completion_tokens || 0; }
          } catch { /* skip */ }
        }
      }
      // 剩余 buffer
      if (buffer.trim().startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
        try {
          const chunk = JSON.parse(buffer.trim().slice(6));
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) writer.write(encoder.encode(`data: ${JSON.stringify({ type: "text", text: delta.content })}\n\n`));
        } catch { /* skip */ }
      }
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done", stop_reason: "stop", usage: { input_tokens: inputTokens, output_tokens: outputTokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } })}\n\n`));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      try { writer.write(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg, errorType: "stream_error" })}\n\n`)); } catch { /* closed */ }
    } finally {
      clearInterval(heartbeat);
      try { writer.close(); } catch { /* closed */ }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", ...headers },
  });
});
