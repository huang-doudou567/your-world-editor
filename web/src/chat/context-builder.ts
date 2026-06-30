// ── 上下文组装器：将用户本地数据注入 API 请求 ──
import type { Event, Pattern, StorySection } from '../engine/types';

export interface UserContextData {
  recentEntries: Event[];
  patterns: Pattern[];
  storySections: StorySection[];
  nickname: string;
  totalEntries: number;
}

/** 从 Zustand stores 收集数据，截断到合理大小 */
export function buildContextData(opts: {
  entries: Event[];
  patterns: Pattern[];
  story: StorySection[];
  nickname?: string;
}): UserContextData {
  return {
    recentEntries: opts.entries.slice(0, 20),
    patterns: opts.patterns,
    storySections: opts.story,
    nickname: opts.nickname || '',
    totalEntries: opts.entries.length,
  };
}

/** 将上下文数据渲染为注入用户消息的文本块 */
export function formatContextBlock(ctx: UserContextData): string {
  const lines: string[] = ['[用户数据上下文]', ''];

  if (ctx.nickname) {
    lines.push(`用户昵称：${ctx.nickname}`, '');
  }

  lines.push(`总记录数：${ctx.totalEntries} 条`);

  // 最近事件
  if (ctx.recentEntries.length > 0) {
    lines.push('', '## 最近记录（倒序）', '');
    for (const e of ctx.recentEntries) {
      const emoji = { colorful: '🎨', bright: '💡', dark: '🌑' }[e.emotion];
      const modeStr = e.mode ? ` [${e.mode}]` : '';
      const tagStr = e.tag ? ` [${e.tag}]` : '';
      lines.push(`- ${e.timestamp.slice(0, 10)} · ${emoji}${modeStr}${tagStr} ${e.title}`);
      if (e.text) {
        const summary = e.text.length > 100 ? e.text.slice(0, 100) + '…' : e.text;
        lines.push(`  ${summary}`);
      }
    }
  } else {
    lines.push('', '（暂无记录）');
  }

  // 已有模式
  if (ctx.patterns.length > 0) {
    lines.push('', '## 已识别模式', '');
    for (const p of ctx.patterns) {
      const typeLabel = p.type === 'blind_spot' ? '盲区' : '正向模式';
      lines.push(`- [${typeLabel}] ${p.name}：${p.core}`);
      if (p.trigger) lines.push(`  触发情境：${p.trigger}`);
      if (p.countermeasure) lines.push(`  应对：${p.countermeasure}`);
      if (p.cases.length > 0) {
        lines.push(`  案例数：${p.cases.length}（最近：${p.cases[p.cases.length - 1].description.slice(0, 60)}）`);
      }
    }
  } else {
    lines.push('', '（暂无已识别模式）');
  }

  // 叙事层
  if (ctx.storySections.length > 0) {
    lines.push('', '## 叙事层（我的故事）', '');
    for (const s of ctx.storySections) {
      if (s.body.trim()) {
        const summary = s.body.length > 200 ? s.body.slice(0, 200) + '…' : s.body;
        lines.push(`### ${s.title}`);
        lines.push(summary);
        lines.push('');
      }
    }
  } else {
    lines.push('', '（暂无叙事层内容）');
  }

  lines.push('', '[/用户数据上下文]');
  return lines.join('\n');
}
