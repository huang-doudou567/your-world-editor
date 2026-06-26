// ── 聊天引擎：关键词路由 + 槽位填充 + 模板回复 ──
import type { Event, Pattern, ChatMessage, StorySection } from '../engine/types';
import { assessRecordWorthiness, classifyEmotion, classifyEmotionLabel } from '../engine/event-intake';
import { searchEntries, getSystemStats, formatDate } from '../engine/store';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface PipelineContext {
  entries: Event[];
  patterns: Pattern[];
  story: StorySection[];
  onSaveEntry: (e: Event) => void;
  onSavePattern: (p: Pattern) => void;
}

// ── Pipeline 路由 ──

export function routeMessage(text: string, ctx: PipelineContext): ChatMessage | null {
  // 搭建 / 引导
  if (/搭建|启动|初始化|第一次用/.test(text)) {
    return buildSystemMsg(
      `🛑 引导流程\n\n欢迎！我是你的世界编辑器。\n\n接下来几个问题，5分钟搭好你自己的版本。\n\n📍 第1个问题：你的昵称是？`,
      ['→ 检测到触发词「搭建」', '→ 启动 7 步引导 · STEP 1']
    );
  }

  // 记流水账
  if (/记一下|今天|刚刚|有个事|记个事/.test(text)) {
    return handleRecord(text, ctx);
  }

  // 搜索
  if (/上次|之前那时候|找一下|搜一下|我那会/.test(text)) {
    return handleSearch(text, ctx);
  }

  // 推演
  if (/推演一下|帮我推演|人生推演|如果选了.*会怎样/.test(text)) {
    return handleSimulate(text, ctx);
  }

  // 周复盘
  if (/周复盘|照镜子|这周怎么样|回顾|反思/.test(text)) {
    return handleReview(text, ctx);
  }

  // 情绪
  if (/我住在哪个窗格|窗格|情绪/.test(text)) {
    return handleEmotion(text, ctx);
  }

  // 系统评估
  if (/系统评估|效果怎么样|进步了吗/.test(text)) {
    return handleEval(text, ctx);
  }

  // 金句 / 诗词
  if (/收藏|金句|摘一句|记一首|短诗|诗/.test(text)) {
    return handleQuote(text, ctx);
  }

  // merge
  if (/merge|沉淀|总结|整理|值得记住/.test(text)) {
    return handleMerge(text, ctx);
  }

  // 默认：尝试判定是否值得记
  const intake = assessRecordWorthiness(text);
  if (intake.worthRecording && intake.score >= 6) {
    return buildSystemMsg(
      `我检测到这可能值得记录（评分 ${intake.score}/20）：\n\n📝 标题：${intake.extractedTitle}\n🏷 标签：${intake.suggestedTag || '无'}\n\n要不要记一条？\n\n💡 回复「记一下」确认写入。`,
      intake.reasons.map(r => `→ ${r}`)
    );
  }

  return buildSystemMsg(
    '收到。你可以试试：\n\n📝 记流水账：说「记一下，今天…」\n🔍 检索回忆：说「上次我跟XX…」\n🧭 推演：说「推演一下…」\n🪞 周复盘：说「照镜子」\n🎨 看情绪：说「我这周住在哪个窗格」\n\n或者直接说你想聊的。',
    ['→ 未命中路由，展示菜单']
  );
}

// ── Pipeline 实现 ──

function handleRecord(text: string, ctx: PipelineContext): ChatMessage {
  const content = text.replace(/^(记一下[，,]\s*|今天[，,]\s*|刚刚[，,]\s*)/, '').trim();
  const intake = assessRecordWorthiness(content);
  const emotion = classifyEmotion(content);
  const emotionLabel = classifyEmotionLabel(emotion.emotion);

  const event: Event = {
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    tag: intake.suggestedTag as Event['tag'],
    mode: intake.suggestedMode as Event['mode'],
    emotion: emotion.emotion,
    title: intake.extractedTitle,
    text: content,
    source: 'free_text',
    patternRefs: [],
    confidence: intake.score >= 10 ? 'high' : 'medium',
    grounded: true,
    merged: false,
  };

  // 检查是否命中已有模式
  const matchedPatterns = ctx.patterns.filter(p =>
    p.cases.length > 0 && content.includes(p.trigger.slice(0, 4))
  );
  if (matchedPatterns.length > 0) {
    event.patternRefs = matchedPatterns.map(p => p.name);
  }

  ctx.onSaveEntry(event);

  const lines = [
    `记录完成 ✅`,
    ``,
    `📝 ${event.title}`,
    `🏷 ${event.tag || '无标签'} · ${emotionLabel}`,
    `📊 信号评分：${intake.score}/20（置信度 ${event.confidence}）`,
  ];

  if (matchedPatterns.length > 0) {
    lines.push(``, `⚠️ 命中已有模式：${matchedPatterns.map(p => p.name).join('、')}`);
    const latest = matchedPatterns[0];
    lines.push(`这条是第 ${latest.cases.length + 1} 次触发「${latest.name}」`);
  }

  return buildSystemMsg(lines.join('\n'), [
    `→ event_intake(text) → score: ${intake.score}, tag: ${intake.suggestedTag || '无'}`,
    `→ classify_emotion → ${emotion.emotion} (${emotion.confidence})`,
    `→ pattern_match → ${matchedPatterns.length > 0 ? `命中 ${matchedPatterns.length} 个模式` : '无命中'}`,
    `→ append_journal_entry → 写入完成`,
  ]);
}

function handleSearch(text: string, ctx: PipelineContext): ChatMessage {
  const query = text.replace(/^(上次|之前|那时候|找一下|搜一下|我那会)/, '').trim();
  const results = searchEntries(ctx.entries, query, 5);

  if (results.length === 0) {
    return buildSystemMsg(
      `没有找到和「${query}」相关的记录。\n\n试试换个说法？或者这条记录还没记进来。`,
      [`→ search_entries("${query}") → 0 条结果`]
    );
  }

  const lines = [`找到 ${results.length} 条相关记录：`, ''];
  for (const e of results) {
    const date = formatDate(e.timestamp);
    const emoji = { colorful: '🎨', bright: '💡', dark: '🌑' }[e.emotion];
    lines.push(`📅 ${date} · ${emoji} ${e.title}`);
    if (e.text) lines.push(`  ${e.text.slice(0, 80)}…`);
    lines.push('');
  }

  return buildSystemMsg(lines.join('\n'), [
    `→ search_entries("${query}", top_n=5) → ${results.length} 条`,
  ]);
}

function handleSimulate(_text: string, ctx: PipelineContext): ChatMessage {
  const hasStory = ctx.story.some(s => s.body.trim().length > 0);
  const hasPatterns = ctx.patterns.length > 0;

  const lines = [
    `🧭 决策推演 · 三条路径`,
    ``,
    `📍 当前路径：继续深耕现在`,
    `  基于你的行业和岗位，5年后天花板在哪？什么技能在贬值？`,
    `  ${!hasPatterns ? '（暂无模式数据——建议先积累一段时间的记录）' : '（基于模式层数据推导）'}`,
    ``,
    `📍 转型路径：行业被重塑时往哪迁`,
    `  你已经攒了哪些能力？可以迁移到哪些赛道？`,
    `  ${!hasPatterns ? '（暂无模式数据——记录中积累可迁移能力的痕迹）' : '（基于模式层识别的可迁移能力）'}`,
    ``,
    `📍 理想路径：如果不考虑收入`,
    `  什么让你真正幸福？现实约束是什么？`,
    `  ${!hasStory ? '（暂无叙事层数据——可以先去填「我的故事」）' : '（基于叙事层价值观推导）'}`,
    ``,
    `⚠️ 这是模拟推演。在真实 Claude Code 版本中，推演会基于你的日记、模式和价值观数据，每条路径都会具体到数字和行动步骤。`,
  ];

  return buildSystemMsg(lines.join('\n'), [
    `→ 读取叙事层 → ${hasStory ? '已找到价值观' : '为空'}`,
    `→ 读取模式层 → ${hasPatterns ? ctx.patterns.length + ' 个模式' : '为空'}`,
    `→ 推演三条路径 → 已生成框架`,
  ]);
}

function handleReview(_text: string, ctx: PipelineContext): ChatMessage {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekEntries = ctx.entries.filter(e => e.timestamp >= weekAgo);
  const emotionDist = { colorful: 0, bright: 0, dark: 0 };
  for (const e of weekEntries) emotionDist[e.emotion]++;

  const lines = [
    `🪞 周复盘 · 递镜模式`,
    ``,
    `本周记录 ${weekEntries.length} 条：`,
    `🎨 彩色窗格：${emotionDist.colorful} 条`,
    `💡 明亮窗格：${emotionDist.bright} 条`,
    `🌑 黑暗窗格：${emotionDist.dark} 条`,
    ``,
    `📡 本周盲区动态：`,
  ];

  for (const p of ctx.patterns.filter(p => p.type === 'blind_spot')) {
    const recent = p.cases.filter(c => c.timestamp >= weekAgo);
    if (recent.length > 0) {
      lines.push(`  · 「${p.name}」：本周触发 ${recent.length} 次`);
    }
  }
  if (ctx.patterns.filter(p => p.type === 'blind_spot').every(p => p.cases.filter(c => c.timestamp >= weekAgo).length === 0)) {
    lines.push('  · 本周未触发已知盲区 ✅');
  }

  if (emotionDist.dark / Math.max(weekEntries.length, 1) > 0.5) {
    lines.push('', '💭 本周黑暗窗格占比过半——想聊聊吗？');
  }

  lines.push('', '（不打分，不给 to-do。只照镜子。行动由你自己决定。）');

  return buildSystemMsg(lines.join('\n'), [
    `→ 本周 ${weekEntries.length} 条事件`,
    `→ 情绪分布：彩色${emotionDist.colorful} / 明亮${emotionDist.bright} / 黑暗${emotionDist.dark}`,
    `→ 盲区扫描完成`,
  ]);
}

function handleEmotion(_text: string, ctx: PipelineContext): ChatMessage {
  const emotionDist = { colorful: 0, bright: 0, dark: 0 };
  for (const e of ctx.entries) emotionDist[e.emotion]++;

  const total = ctx.entries.length;
  const lines = [
    `🎨 情绪窗格分布`,
    ``,
    `📊 全部 ${total} 条事件：`,
    `🎨 彩色窗格：${emotionDist.colorful} 条（${total > 0 ? Math.round(emotionDist.colorful / total * 100) : 0}%）`,
    `💡 明亮窗格：${emotionDist.bright} 条（${total > 0 ? Math.round(emotionDist.bright / total * 100) : 0}%）`,
    `🌑 黑暗窗格：${emotionDist.dark} 条（${total > 0 ? Math.round(emotionDist.dark / total * 100) : 0}%）`,
    ``,
  ];

  if (emotionDist.dark / Math.max(total, 1) > 0.4) {
    lines.push('⚠️ 黑暗占比偏高。不是坏事——只是值得关注。');
  } else if (emotionDist.colorful / Math.max(total, 1) > 0.4) {
    lines.push('✨ 彩色占比较高。看看什么让你开心——多做这些事。');
  } else {
    lines.push('三窗格分布均衡。你住在明亮窗格为主——日常的节奏。');
  }

  return buildSystemMsg(lines.join('\n'), [
    `→ 按 emotion 字段聚合 ${total} 条事件`,
  ]);
}

function handleEval(_text: string, ctx: PipelineContext): ChatMessage {
  const stats = getSystemStats(ctx.entries, ctx.patterns);

  const lines = [
    `📊 系统评估`,
    ``,
    `🫀 系统健康度：${stats.healthScore}/100`,
    `  · 活跃天数：${stats.activeDays} 天`,
    `  · 总条目数：${stats.totalEntries}`,
    ``,
    `🎯 盲区改善度：${stats.blindSpotImprovement}/100`,
    `  · 盲区再现率：${Math.round(stats.blindSpotRecurrence * 100)}%`,
    `  · 已识别盲区：${stats.blindSpotPatterns} 个`,
    ``,
    `📚 叙事沉淀率：${stats.narrativeScore}/100`,
    `  · merge 条目：${stats.mergedCount}`,
    `  · merge 率：${Math.round(stats.mergeRate * 100)}%`,
    ``,
    `数据还不多——用久之后评估会更有参考价值。`,
  ];

  return buildSystemMsg(lines.join('\n'), [
    `→ generate_eval_report → 三维评分完成`,
  ]);
}

function handleQuote(text: string, ctx: PipelineContext): ChatMessage {
  const content = text.replace(/^(收藏|金句|摘一句|记一首|短诗|诗)[，,]\s*/, '').trim();
  const event: Event = {
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    tag: '洞察', mode: '', emotion: 'colorful',
    title: content.slice(0, 40),
    text: content,
    source: 'free_text', patternRefs: [], confidence: 'medium', grounded: true, merged: false,
  };
  ctx.onSaveEntry(event);

  return buildSystemMsg(
    `记好了 ✨\n\n「${content}」\n\n这条进了 🎨 彩色窗格。它以后会在你踩坑时回来找你——不是 AI 鸡汤，是你自己留下的话。`,
    ['→ 标签判断: 洞察', '→ 情绪: colorful', '→ 已写入叙事层金句库']
  );
}

function handleMerge(_text: string, _ctx: PipelineContext): ChatMessage {
  return buildSystemMsg(
    `📚 沉淀叙事\n\n当前没有发现自动聚类的事件候选。在真实版本中，当 3+ 条同主题事件形成集群时，系统会自动建议 merge。\n\n现在，你可以手动打开「我的故事」面板，把你觉得值得记住的东西写进去。`,
    ['→ 调用 generate_insights → merge_candidates 为空']
  );
}

// ── 辅助 ──

function buildSystemMsg(content: string, thinking: string[]): ChatMessage {
  return {
    id: uid(),
    role: 'system' as const,
    content,
    thinking,
    timestamp: new Date().toISOString(),
  };
}
