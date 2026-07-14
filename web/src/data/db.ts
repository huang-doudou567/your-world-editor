// ── 数据层：localStorage CRUD ──
import type { Event, Pattern, Decision, StorySection } from '../engine/types';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const PREFIX = 'ywe_';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* storage full — silent fail */ }
}

function remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// ── Journal ──
export async function loadJournal(): Promise<Event[]> {
  const all = load<Record<string, Event>>('journal', {});
  return Object.values(all).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function saveEntry(entry: Event): Promise<void> {
  if (!entry.id) entry.id = uid();
  const all = load<Record<string, Event>>('journal', {});
  all[entry.id] = entry;
  save('journal', all);
}

export async function deleteEntry(id: string): Promise<void> {
  const all = load<Record<string, Event>>('journal', {});
  delete all[id];
  save('journal', all);
}

// ── Patterns ──
export async function loadPatterns(): Promise<Pattern[]> {
  return load<Pattern[]>('patterns', []);
}

export async function savePattern(pattern: Pattern): Promise<void> {
  if (!pattern.id) pattern.id = uid();
  const all = load<Pattern[]>('patterns', []);
  const idx = all.findIndex(p => p.id === pattern.id);
  if (idx >= 0) all[idx] = pattern;
  else all.push(pattern);
  save('patterns', all);
}

// ── Story ──
export async function loadStory(): Promise<StorySection[]> {
  return load<StorySection[]>('story', []);
}

export async function saveStory(sections: StorySection[]): Promise<void> {
  save('story', sections);
}

// ── Decisions ──
export async function loadDecisions(): Promise<Decision[]> {
  return load<Decision[]>('decisions', []);
}

export async function saveDecision(decision: Decision): Promise<void> {
  if (!decision.id) decision.id = uid();
  const all = load<Decision[]>('decisions', []);
  const idx = all.findIndex(d => d.id === decision.id);
  if (idx >= 0) all[idx] = decision;
  else all.push(decision);
  save('decisions', all);
}

// ── Meta ──
export async function getMeta(key: string): Promise<string | null> {
  const all = load<Record<string, string>>('meta', {});
  return all[key] ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const all = load<Record<string, string>>('meta', {});
  all[key] = value;
  save('meta', all);
}

// ── Decision Answers（决策推演模块数据持久化）──
export interface DecisionAnswerItem {
  pathKey: string;
  pathTitle: string;
  prompt: string;
  answer: string;
  timestamp: string;
}

export async function loadDecisionAnswers(): Promise<DecisionAnswerItem[]> {
  return load<DecisionAnswerItem[]>('decision_answers', []);
}

export async function saveDecisionAnswer(item: DecisionAnswerItem): Promise<void> {
  const all = load<DecisionAnswerItem[]>('decision_answers', []);
  all.push(item);
  save('decision_answers', all);
}

export async function clearDecisionAnswers(): Promise<void> {
  remove('decision_answers');
}

export async function clearAll(): Promise<void> {
  const keys = ['journal', 'patterns', 'story', 'decisions', 'meta'];
  for (const k of keys) remove(k);
}
