// ── 数据模型：与 Python models.py 对齐 ──

export type EventTag = '' | '感情' | '梦境' | '健康' | '财务' | '工作事业' | '决策' | '模式' | '洞察';

export const TAG_OPTIONS: { value: EventTag; label: string; emoji: string }[] = [
  { value: '', label: '无标签', emoji: '🏷' },
  { value: '感情', label: '感情', emoji: '❤️' },
  { value: '梦境', label: '梦境', emoji: '🌙' },
  { value: '健康', label: '健康', emoji: '🏥' },
  { value: '财务', label: '财务', emoji: '💰' },
  { value: '工作事业', label: '工作事业', emoji: '💼' },
  { value: '决策', label: '决策', emoji: '🎯' },
  { value: '模式', label: '模式', emoji: '🔄' },
  { value: '洞察', label: '洞察', emoji: '💡' },
];

export const TAG_MAP = Object.fromEntries(TAG_OPTIONS.map(t => [t.value, t])) as Record<EventTag, typeof TAG_OPTIONS[number]>;

export interface Event {
  id?: string;
  timestamp: string;
  tag: EventTag;
  mode: '' | '❌' | '✅';
  emotion: 'colorful' | 'bright' | 'dark';
  title: string;
  text: string;
  source: string;
  patternRefs: string[];
  confidence: 'high' | 'medium' | 'low';
  grounded: boolean;
  merged: boolean;
}

export interface PatternCase {
  timestamp: string;
  symbol: '❌' | '✅';
  description: string;
  bookquote?: string;
}

export interface BookQuote {
  type: '❌' | '✅' | '通用';
  text: string;
  source: string;
}

export interface Pattern {
  id?: string;
  name: string;
  type: 'positive' | 'blind_spot';
  trigger: string;
  core: string;
  rootCause: string;
  countermeasure: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  emotionalTriggers: string[];
  bookquotes: BookQuote[];
  cases: PatternCase[];
}

export interface Decision {
  id?: string;
  timestamp: string;
  context: string;
  choice: string;
  frameworkUsed: string;
  frameworkApplied: boolean;
  blindSpotScan: string[];
  reasoning: string;
  reviewDate: string;
  actualOutcome: string;
  outcomeDeviation: string;
}

export interface WeeklyReview {
  weekLabel: string;
  timePie: Record<string, number>;
  dimensions: Record<string, string>;
  blindSpotHits: { name: string; countNeg: number; countPos: number }[];
  ahaMoments: string[];
  fragmentTime: string;
  bodyBase: string;
  emotionDist: { colorful: number; bright: number; dark: number };
}

export interface StorySection {
  title: string;
  body: string;
}

export interface IntakeResult {
  worthRecording: boolean;
  score: number;
  suggestedTag: string;
  suggestedMode: string;
  reasons: string[];
  extractedTitle: string;
}

export interface EmotionResult {
  emotion: 'colorful' | 'bright' | 'dark';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface SystemStats {
  totalEntries: number;
  totalPatterns: number;
  blindSpotPatterns: number;
  positivePatterns: number;
  emotionDist: { colorful: number; bright: number; dark: number };
  blindSpotRecurrence: number;
  mergedCount: number;
  mergeRate: number;
  activeDays: number;
  healthScore: number;
  blindSpotImprovement: number;
  narrativeScore: number;
}

// ── Chat ──

export interface SuggestedRecord {
  title: string;
  tag: string;
  emotion: 'colorful' | 'bright' | 'dark';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  thinking?: string;
  timestamp: string;
  isStreaming?: boolean;
  error?: string;
  suggestedRecord?: SuggestedRecord;
  recordSaved?: boolean;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
}
