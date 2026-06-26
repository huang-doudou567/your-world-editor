// ── 搜索 + 统计：移植自 scripts/corpus/store.py ──
import type { Event, SystemStats } from './types';

export function searchEntries(entries: Event[], query: string, topN = 10): Event[] {
  if (!query.trim()) return entries.slice(0, topN);

  const now = new Date();
  const scored = entries.map(e => {
    let s = 0;
    const text = e.text || '';
    const title = e.title || '';
    const tag = e.tag || '';

    if (text.includes(query)) s += 10;
    if (title.includes(query)) s += 5;

    const keywords = query.split(/\s+/).filter(k => k.length >= 2);
    for (const kw of keywords) {
      if (text.includes(kw)) s += 3;
      if (tag.includes(kw)) s += 2;
    }

    // 近期加权
    const days = (now.getTime() - new Date(e.timestamp).getTime()) / 86400000;
    if (days <= 7) s += 5;
    else if (days <= 30) s += 3;
    else if (days <= 90) s += 1;

    return { entry: e, score: s };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.entry);
}

export function getSystemStats(entries: Event[], patterns: { type: string; cases: { symbol: string }[] }[]): SystemStats {
  const total = entries.length;
  const emotionDist = { colorful: 0, bright: 0, dark: 0 };
  let mergedCount = 0;

  for (const e of entries) {
    emotionDist[e.emotion]++;
    if (e.merged) mergedCount++;
  }

  const blindSpotPatterns = patterns.filter(p => p.type === 'blind_spot');
  const totalBlindCases = blindSpotPatterns.reduce((sum, p) => sum + p.cases.length, 0);
  const negCases = blindSpotPatterns.reduce((sum, p) => sum + p.cases.filter(c => c.symbol === '❌').length, 0);

  const activeSet = new Set(entries.map(e => e.timestamp.slice(0, 10)));
  const activeDays = activeSet.size;

  const blindSpotRecurrence = totalBlindCases > 0 ? negCases / totalBlindCases : 0;
  const mergeRate = total > 0 ? mergedCount / total : 0;

  // 三维评分
  const healthScore = Math.min(100, Math.round(activeDays * 3 + total * 2));
  const blindSpotImprovement = Math.min(100, Math.round((1 - blindSpotRecurrence) * 100));
  const narrativeScore = Math.min(100, Math.round(mergeRate * 200));

  return {
    totalEntries: total,
    totalPatterns: patterns.length,
    blindSpotPatterns: blindSpotPatterns.length,
    positivePatterns: patterns.filter(p => p.type === 'positive').length,
    emotionDist,
    blindSpotRecurrence,
    mergedCount,
    mergeRate,
    activeDays,
    healthScore,
    blindSpotImprovement,
    narrativeScore,
  };
}

export function formatDate(ts: string): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
