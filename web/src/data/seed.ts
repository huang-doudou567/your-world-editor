// ── 预设演示数据 ──
import type { Event, Pattern, StorySection } from '../engine/types';
import { saveEntry, savePattern, saveStory, setMeta, getMeta } from './db';

const DEMO_EVENTS: Event[] = [
  {
    timestamp: '2026-06-26 09:30',
    tag: '健康', mode: '', emotion: 'bright',
    title: '洗头 + 打针第二天',
    text: '日常健康维护。洗了头，去打了调节经期的第二天针。',
    source: 'free_text', patternRefs: [], confidence: 'medium', grounded: true, merged: false,
  },
  {
    timestamp: '2026-06-25 16:00',
    tag: '工作事业', mode: '', emotion: 'bright',
    title: '拒绝长沙农商行柜员岗——怅然若失后，坚定这是对的',
    text: '昨天拒了长沙农商银行面向农村片区的柜员岗。有一点点怅然若失，但安静下来后，坚定这是正确的选择。',
    source: 'free_text', patternRefs: [], confidence: 'high', grounded: true, merged: false,
  },
  {
    timestamp: '2026-06-24 20:15',
    tag: '工作事业', mode: '', emotion: 'dark',
    title: '又被暗示不够 proactive，第三次了',
    text: '领导在周会上又一次暗示我不够 proactive。这是这个季度第三次了。我意识到这可能是我一直在逃避主动做决定导致的——每次都是拖到不得不选。',
    source: 'free_text', patternRefs: ['被暗示不够好'], confidence: 'high', grounded: true, merged: false,
  },
  {
    timestamp: '2026-06-22 12:00',
    tag: '感情', mode: '', emotion: 'colorful',
    title: '周末徒步——和老张聊了很久',
    text: '和老张去爬了趟山，聊了很多。他被裁了三个月还没找到工作，但意外地平静。他说"被替代的不是我，是被替代的那个岗位"。被理解的感觉真好。',
    source: 'free_text', patternRefs: [], confidence: 'medium', grounded: true, merged: false,
  },
  {
    timestamp: '2026-06-20 10:00',
    tag: '模式', mode: '❌', emotion: 'dark',
    title: '又被摸底家庭情况，边界被侵犯',
    text: '副部长再次来摸底家庭情况。正部长之前居然还把个人信息外传了。对这种无边界文化彻底失望。决定明天直接说"不方便"。',
    source: 'free_text', patternRefs: ['边界侵犯'], confidence: 'high', grounded: true, merged: false,
  },
];

const DEMO_PATTERNS: Pattern[] = [
  {
    name: '被暗示不够好',
    type: 'blind_spot',
    trigger: '权威人物（领导/老师）暗示 "你还不够"',
    core: '当被暗示不够好时，倾向于内化这个评价而不是质疑它的公平性',
    rootCause: '成长环境中被反复评价的环境',
    countermeasure: '识别暗示时问自己："他说的具体是哪件事？有没有客观标准？"',
    source: 'observed',
    confidence: 'medium',
    emotionalTriggers: ['被评价', '被比较'],
    bookquotes: [],
    cases: [
      { timestamp: '2026-06-24', symbol: '❌', description: '领导暗示不够 proactive——内化并焦虑' },
      { timestamp: '2026-05-08', symbol: '❌', description: '项目评审被暗示"没有主动思考"——自我怀疑一整周' },
      { timestamp: '2026-03-12', symbol: '❌', description: '年终评估："你还差一口气"——放弃了当时想争取的转岗' },
    ],
  },
  {
    name: '主动选择风险',
    type: 'positive',
    trigger: '面临两难选择，有一条明显更难但更自由的路',
    core: '在关键的十字路口，倾向于选择更难但更自主的方向',
    rootCause: '',
    countermeasure: '',
    source: 'observed',
    confidence: 'medium',
    emotionalTriggers: ['自由 vs 稳定', '从众 vs 独立'],
    bookquotes: [{ type: '✅', text: '没有决心的人，不可能拥有命运', source: '黄豆豆' }],
    cases: [
      { timestamp: '2026-06-25', symbol: '✅', description: '拒绝柜员岗——选择不确定性' },
    ],
  },
];

const DEMO_STORY: StorySection[] = [
  { title: '开篇 · 一句话认识我', body: '我叫黄豆豆。正在学习做自己人生的编辑。\n' },
  { title: '三、我常说的话（金句库）', body: '- 「没有决心的人，不可能拥有命运」\n' },
  {
    title: '四、有感觉的短诗',
    body: '### 《年轻》\n\n在山顶吹风，看星星。\n我们围坐一桌，谈天，\n拥抱彼此，\n又被风吹散。\n\n— 黄豆豆 · 2026-06-26\n',
  },
];

export async function seedIfFirstVisit(): Promise<void> {
  const seeded = await getMeta('seeded');
  if (seeded === 'true') return;

  for (const e of DEMO_EVENTS) await saveEntry(e);
  for (const p of DEMO_PATTERNS) await savePattern(p);
  await saveStory(DEMO_STORY);
  await setMeta('seeded', 'true');
}
