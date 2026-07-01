// ── Express 服务器：DeepSeek API SSE 代理 ──
// 运行方式：npx tsx server/index.ts
// 需要环境变量：DEEPSEEK_API_KEY

import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import OpenAI from 'openai';

const PORT = parseInt(process.env.SERVER_PORT || '3003', 10);
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

if (!API_KEY) {
  console.error('❌ 缺少 DEEPSEEK_API_KEY 环境变量');
  console.error('   Windows: set DEEPSEEK_API_KEY=sk-...');
  console.error('   Mac/Linux: export DEEPSEEK_API_KEY=sk-...');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// ── 系统提示词 ──
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

// ── Express App ──

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ── Health ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: MODEL, provider: 'deepseek' });
});

// ── Chat (SSE stream) ──
app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages, contextBlock } = req.body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    contextBlock?: string;
  };

  if (!messages || messages.length === 0) {
    res.status(400).json({ error: 'messages is required' });
    return;
  }

  // 构建 messages：系统提示词 + 可选上下文 + 对话历史
  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // 上下文作为独立的 system 消息发送，不与用户消息混在一起
  if (contextBlock) {
    apiMessages.push({ role: 'system', content: contextBlock });
  }

  for (const msg of messages) {
    apiMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      max_tokens: 4096,
      stream: true,
    });

    // 心跳
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    let finishReason = 'stop';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // 思考过程（deepseek-reasoner 模型专有）
      if (delta?.reasoning_content) {
        res.write(
          `data: ${JSON.stringify({ type: 'thinking', text: delta.reasoning_content })}\n\n`,
        );
      }

      // 正文
      if (delta?.content) {
        res.write(
          `data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`,
        );
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
    }

    clearInterval(heartbeat);

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        stop_reason: finishReason,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      })}\n\n`,
    );

    res.end();
  } catch (error: unknown) {
    let errorMsg = '未知错误';
    let errorType = 'unknown';

    if (error instanceof OpenAI.AuthenticationError) {
      errorMsg = 'API Key 无效，请检查 DEEPSEEK_API_KEY 配置';
      errorType = 'auth_error';
    } else if (error instanceof OpenAI.RateLimitError) {
      errorMsg = 'API 速率限制，请稍后重试';
      errorType = 'rate_limit';
    } else if (error instanceof OpenAI.BadRequestError) {
      errorMsg = '请求格式错误：' + error.message;
      errorType = 'bad_request';
    } else if (error instanceof OpenAI.APIError) {
      errorMsg = `DeepSeek API 错误 (${error.status}): ${error.message}`;
      errorType = 'api_error';
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }

    console.error('[chat error]', errorType, errorMsg);
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: errorMsg, errorType })}\n\n`,
    );
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`🧠 你的世界编辑器 · API 服务已启动`);
  console.log(`   http://localhost:${PORT}/api/chat`);
  console.log(`   模型：${MODEL}`);
  console.log(`   提供商：DeepSeek`);
});
