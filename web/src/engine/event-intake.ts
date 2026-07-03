// ── 信号打分 + 情绪分类 + 场景路由：移植自 scripts/corpus/event_intake.py ──
import type { IntakeResult, EmotionResult } from './types';

const HIGH_SIGNAL_WORDS: Record<string, [string, number]> = {
  // ── 决策信号 ──
  '决定了': ['决策', 8], '选择了': ['决策', 8], '放弃了': ['决策', 7],
  '接不接': ['决策', 9], '要不要': ['决策', 8], '该不该': ['决策', 8],
  '拒绝': ['决策', 7], '拒了': ['决策', 7], '不去了': ['决策', 7],
  '纠结': ['决策', 6], '拿不准': ['决策', 7], '定不下来': ['决策', 7],
  '下决心': ['决策', 8], '拍板': ['决策', 7], '选哪个': ['决策', 7],
  '二选一': ['决策', 7], '难选': ['决策', 6], '下定决心': ['决策', 8],
  '权衡': ['决策', 6], '取舍': ['决策', 6], '犹豫': ['决策', 5],
  '拿主意': ['决策', 6], '想好了': ['决策', 7], '就它了': ['决策', 7],
  // ── 模式信号 ──
  '又开始了': ['模式', 9], '又犯了': ['模式', 9], '还是那样': ['模式', 7],
  '我怎么老是': ['模式', 10], '又踩坑了': ['模式', 9],
  '这次没': ['模式', 7], '突破了': ['模式', 8], '居然没': ['模式', 7],
  '又来了': ['模式', 7], '老毛病': ['模式', 8], '第三次了': ['模式', 9],
  '又来一遍': ['模式', 8], '重蹈覆辙': ['模式', 9], '循环': ['模式', 7],
  '老样子': ['模式', 5], '改不了': ['模式', 7], '惯性': ['模式', 6],
  '又陷入': ['模式', 8], '又在': ['模式', 6], '反复': ['模式', 7],
  // ── 洞察信号 ──
  '想清楚了一件事': ['洞察', 10], '我意识到': ['洞察', 8],
  '原来如此': ['洞察', 6], '想通了': ['洞察', 7],
  '坚定': ['洞察', 6], '笃定': ['洞察', 6],
  '突然明白': ['洞察', 8], '恍然': ['洞察', 7], '顿悟': ['洞察', 9],
  '反思了一下': ['洞察', 7], '回头看': ['洞察', 6], '总结下来': ['洞察', 7],
  '学到了': ['洞察', 7], '教训': ['洞察', 6], '成长': ['洞察', 6],
  '以前没发现': ['洞察', 8], '现在才懂': ['洞察', 7], '终于明白': ['洞察', 8],
  // ── 情绪信号 ──
  '崩溃': ['', 6], '撑不住了': ['', 6], '怅然若失': ['', 6],
  '很失落': ['', 5], '特别开心': ['', 5], '特别沮丧': ['', 5],
  '难受': ['', 5], '哭了': ['', 6], '感动': ['', 5],
  '窝火': ['', 5], '气不过': ['', 5], '委屈': ['', 5],
  '喘不过气': ['', 6], '绷不住': ['', 6], '破防': ['', 6],
  '开心得要命': ['', 5], '太爽了': ['', 5], '治愈': ['', 5],
  '释怀': ['', 5], '放下了': ['', 6], '坦然': ['', 5],
  // ── 事件信号 ──
  '面试了': ['', 7], '拿到offer': ['决策', 9],
  '辞职': ['决策', 9], 'offer': ['决策', 8], '岗位': ['决策', 5],
  '入职': ['工作事业', 7], '离职': ['工作事业', 7], '跳槽': ['工作事业', 7],
  '涨薪': ['工作事业', 7], '被裁': ['工作事业', 8], '转岗': ['工作事业', 7],
  '加班': ['工作事业', 5], '年终': ['工作事业', 6], '述职': ['工作事业', 6],
  // ── 关系信号 ──
  '吵架': ['感情', 7], '冷战': ['感情', 7], '分手': ['感情', 8],
  '在一起': ['感情', 7], '表白': ['感情', 7], '约会': ['感情', 6],
  '朋友聚': ['感情', 5], '认识了一个': ['感情', 6], '聊得很': ['感情', 5],
  '和家人': ['感情', 5], '陪爸妈': ['感情', 5], '回老家': ['感情', 5],
  // ── 健康信号 ──
  '去医院': ['健康', 7], '吃药': ['健康', 6], '不舒服': ['健康', 6],
  '失眠': ['健康', 6], '睡不好': ['健康', 6], '头疼': ['健康', 5],
  '运动': ['健康', 5], '跑步': ['健康', 5], '体检': ['健康', 7],
  '生病': ['健康', 7], '好转': ['健康', 5], '康复': ['健康', 5],
  // ── 财务信号 ──
  '花了': ['财务', 5], '存钱': ['财务', 6], '理财': ['财务', 6],
  '投资': ['财务', 7], '亏了': ['财务', 7], '赚了': ['财务', 7],
  '房租': ['财务', 5], '贷款': ['财务', 7], '还钱': ['财务', 6],
  '工资': ['财务', 5], '奖金': ['财务', 6], '省着': ['财务', 5],
  // ── 梦境信号 ──
  '做梦': ['梦境', 8], '梦到': ['梦境', 8], '梦见': ['梦境', 8],
  '昨天梦': ['梦境', 9], '做了个梦': ['梦境', 9], '梦里': ['梦境', 7],
  '噩梦': ['梦境', 7], '怪梦': ['梦境', 7],
};

const LOW_SIGNAL_PREFIXES = ['你好', '谢谢', '再见', '好的', '嗯', '哦', '行', '帮我查', '什么', '怎么用', '在哪'];

const COLORFUL_KEYWORDS = [
  '开心', '高兴', '兴奋', '温暖', '感恩', '有意义', '值得',
  '顿悟', '灵感', '被理解', '被认可', '成就感', '幸福', '快乐',
  '惊喜', '感动', '好运', '感谢', '庆祝', '想通了', '突破',
  '坚定', '笃定', '释然', '踏实', '豁然开朗',
  '治愈', '美好', '幸运', '满足', '自豪', '爽', '太棒了',
  '棒极了', '心满意足', '充实', '舒心', '畅快', '释怀',
  '被爱', '被尊重', '自由', '放松', '安心',
];

const DARK_KEYWORDS = [
  '烦', '愤怒', '不满', '失望', '孤独', '无力',
  '害怕', '焦虑', '痛苦', '侮辱', '边界侵犯', '不被理解',
  '伤心', '崩溃', '绝望', '被矮化', '不甘',
  '忍不了', '受不了', '抑郁', '不信任', '被冒犯', '被忽视', '失眠',
  '怅然', '怅然若失', '空落落', '迷茫', '不知所措',
  '憋屈', '窝囊', '心累', '倦怠', '没意思',
  '难过', '委屈', '压抑', '窒息', '喘不过气',
  '挫败', '气馁', '丧', '颓', '想哭',
  '被敷衍', '被轻视', '被针对', '不公平', '冷漠',
  '嫉妒', '不甘心', '后悔', '愧疚', '自责',
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

// ── 场景意图路由：本地检测用户输入的场景类型 ──
export type SceneIntent =
  | 'record'       // 记流水账
  | 'search'       // 检索回忆
  | 'simulate'     // 决策推演
  | 'review'       // 周复盘/照镜子
  | 'emotion_check' // 查看情绪分布
  | 'evaluate'     // 系统评估
  | 'collect'      // 收藏金句
  | 'merge'        // 沉淀叙事
  | 'dream'        // 记梦
  | 'analyze'      // 分析决策
  | 'unknown';     // 无法识别

interface SceneRoute {
  intent: SceneIntent;
  patterns: string[];
}

const SCENE_ROUTES: SceneRoute[] = [
  {
    intent: 'record',
    patterns: [
      '记一下', '记个', '记一', '记录', '记下来', '写一下',
      '今天', '刚刚', '刚才', '昨天', '上周', '这周',
      '发生', '经历了', '做完', '去了', '回来',
      '记下', '记录一下', '记一笔', '写一笔', '补记',
      '想记', '要记', '先说', '说个事',
    ],
  },
  {
    intent: 'search',
    patterns: [
      '搜一下', '搜索', '找一下', '帮我找', '查一下',
      '上次', '之前', '以前', '之前有', '记不记得',
      '有没有记', '找找', '翻一下', '回忆', '不记得',
      '啥时候', '什么时候', '那次', '那个',
    ],
  },
  {
    intent: 'simulate',
    patterns: [
      '推演', '推演一下', '人生推演', '帮我推演',
      '三条路', '三条路径', '推演三条', '展望', '规划',
      '前途', '未来规划', '五年后', '路怎么走',
    ],
  },
  {
    intent: 'review',
    patterns: [
      '照镜子', '周复盘', '复盘', '回顾', '总结',
      '这周怎么样', '最近怎么样', '看看这周',
      '周末总结', '月度总结', '月复盘', '半年总结',
    ],
  },
  {
    intent: 'emotion_check',
    patterns: [
      '住在哪个窗格', '窗格', '情绪分布', '情绪统计',
      '心情怎么样', '最近情绪', '彩色窗格', '黑暗窗格',
      '明亮窗格', '我的情绪', '最近状态', '心态怎么样',
      '这周住', '这个月住', '情绪怎么样',
    ],
  },
  {
    intent: 'evaluate',
    patterns: [
      '系统评估', '效果怎么样', '系统怎么样', '评估',
      '打分', '健康度', '改善度', '沉淀率', '指标',
    ],
  },
  {
    intent: 'collect',
    patterns: [
      '收藏', '金句', '记一句', '收藏一下', '收录',
      '这句话', '名言', '警句', '座右铭', '摘录',
    ],
  },
  {
    intent: 'merge',
    patterns: [
      'merge', '合并', '沉淀', '整理一下', '梳理',
      '归纳', '提炼', '存档', '归档', '定稿',
    ],
  },
  {
    intent: 'dream',
    patterns: [
      '做梦', '梦到', '梦见', '梦境', '做了个梦',
      '昨晚梦', '梦里', '记梦', '怪梦', '噩梦',
    ],
  },
  {
    intent: 'analyze',
    patterns: [
      '帮我分析', '分析一下', '怎么看', '该不该',
      '要不要', '怎么选', '纠结', '难选', '取舍',
      '权衡', '两难', '选择困难', '拿不准',
    ],
  },
];

/** 检测用户输入匹配的场景意图（返回第一个匹配的，按数组顺序） */
export function detectSceneIntent(text: string): { intent: SceneIntent; matched: string } {
  const lower = text.toLowerCase();
  for (const route of SCENE_ROUTES) {
    for (const pattern of route.patterns) {
      if (lower.includes(pattern)) {
        return { intent: route.intent, matched: pattern };
      }
    }
  }
  return { intent: 'unknown', matched: '' };
}
