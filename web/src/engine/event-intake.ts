// ── 信号打分 + 情绪分类：移植自 scripts/corpus/event_intake.py ──
import type { IntakeResult, EmotionResult } from './types';

const HIGH_SIGNAL_WORDS: Record<string, [string, number]> = {
  // 决策信号
  '决定了': ['决策', 8], '选择了': ['决策', 8], '放弃了': ['决策', 7],
  '接不接': ['决策', 9], '要不要': ['决策', 8], '该不该': ['决策', 8],
  '拒绝': ['决策', 7], '拒了': ['决策', 7], '不去了': ['决策', 7],
  // 模式信号
  '又开始了': ['模式', 9], '又犯了': ['模式', 9], '还是那样': ['模式', 7],
  '我怎么老是': ['模式', 10], '又踩坑了': ['模式', 9],
  '这次没': ['模式', 7], '突破了': ['模式', 8], '居然没': ['模式', 7],
  // 洞察信号
  '想清楚了一件事': ['洞察', 10], '我意识到': ['洞察', 8],
  '原来如此': ['洞察', 6], '想通了': ['洞察', 7],
  '坚定': ['洞察', 6], '笃定': ['洞察', 6],
  // 情绪信号
  '崩溃': ['', 6], '撑不住了': ['', 6], '怅然若失': ['', 6],
  '很失落': ['', 5], '特别开心': ['', 5], '特别沮丧': ['', 5],
  // 事件信号
  '面试了': ['', 7], '拿到offer': ['决策', 9],
  '辞职': ['决策', 9], 'offer': ['决策', 8], '岗位': ['决策', 5],
};

const LOW_SIGNAL_PREFIXES = ['你好', '谢谢', '再见', '好的', '嗯', '哦', '行', '帮我查'];

const COLORFUL_KEYWORDS = [
  '开心', '高兴', '兴奋', '温暖', '感恩', '有意义', '值得',
  '顿悟', '灵感', '被理解', '被认可', '成就感', '幸福', '快乐',
  '惊喜', '感动', '好运', '感谢', '庆祝', '想通了', '突破',
  '坚定', '笃定', '释然', '踏实', '豁然开朗',
];

const DARK_KEYWORDS = [
  '烦', '愤怒', '不满', '失望', '孤独', '无力',
  '害怕', '焦虑', '痛苦', '侮辱', '边界侵犯', '不被理解',
  '伤心', '崩溃', '绝望', '被矮化', '不甘',
  '忍不了', '受不了', '抑郁', '不信任', '被冒犯', '被忽视', '失眠',
  '怅然', '怅然若失', '空落落', '迷茫', '不知所措',
];

export function assessRecordWorthiness(text: string): IntakeResult {
  const reasons: string[] = [];
  let score = 0;
  let modeSignal = '';
  const tagHits: Record<string, number> = {};

  if (text.length < 5) {
    return { worthRecording: false, score: 0, suggestedTag: '', suggestedMode: '', reasons: ['文本过短'], extractedTitle: '' };
  }
  if (LOW_SIGNAL_PREFIXES.some(p => text.startsWith(p))) {
    return { worthRecording: false, score: 0, suggestedTag: '', suggestedMode: '', reasons: ['低信号前缀'], extractedTitle: '' };
  }

  for (const [word, [tag, wordScore]] of Object.entries(HIGH_SIGNAL_WORDS)) {
    if (text.includes(word)) {
      score += wordScore;
      reasons.push(`命中信号词「${word}」(+${wordScore})`);
      if (tag) tagHits[tag] = (tagHits[tag] || 0) + wordScore;
      if (word.includes('又') || word.includes('还是') || word.includes('怎么老是')) modeSignal = '❌';
      if (word.includes('突破') || word.includes('居然没') || word.includes('这次没')) modeSignal = '✅';
    }
  }

  if (text.length > 50) { score += 2; reasons.push('长文本 (+2)'); }
  if (text.length > 100) { score += 2; }

  let suggestedTag = '';
  if (Object.keys(tagHits).length > 0) {
    suggestedTag = Object.entries(tagHits).sort((a, b) => b[1] - a[1])[0][0];
  }

  const title = text.split(/[。！？.!?]/)[0].trim().slice(0, 50);

  return {
    worthRecording: score >= 4,
    score: Math.min(score, 20),
    suggestedTag,
    suggestedMode: modeSignal,
    reasons,
    extractedTitle: title,
  };
}

export function classifyEmotion(text: string): EmotionResult {
  const colorfulCount = COLORFUL_KEYWORDS.filter(k => text.includes(k)).length;
  const darkCount = DARK_KEYWORDS.filter(k => text.includes(k)).length;

  if (colorfulCount === 0 && darkCount === 0) {
    return { emotion: 'bright', confidence: 'medium', reason: '未检测到明显情感关键词，默认归入明亮窗格' };
  }
  if (colorfulCount > darkCount) {
    return { emotion: 'colorful', confidence: colorfulCount >= 2 ? 'high' : 'medium', reason: `检测到 ${colorfulCount} 个积极情感信号` };
  }
  if (darkCount > colorfulCount) {
    return { emotion: 'dark', confidence: darkCount >= 2 ? 'high' : 'medium', reason: `检测到 ${darkCount} 个负面情感信号` };
  }
  return { emotion: 'bright', confidence: 'low', reason: `彩色和黑暗信号相等（各${colorfulCount}个）` };
}

export function classifyEmotionLabel(emotion: string): string {
  const map: Record<string, string> = { colorful: '🎨 彩色窗格', bright: '💡 明亮窗格', dark: '🌑 黑暗窗格' };
  return map[emotion] || emotion;
}
