// ── 标签分析框架定义（纯配置，用户可审查修改）──
import type { EventTag } from './types';

export interface TagFramework {
  tag: EventTag;
  title: string;
  description: string;
  keyQuestions: string[];
  patternTypes: ('positive' | 'blind_spot')[];
}

export const TAG_FRAMEWORKS: TagFramework[] = [
  {
    tag: '工作事业',
    title: '职业定位',
    description: '厘清优势与偏好，识别职业中的盲区与正向模式，为职业决策提供数据支撑',
    keyQuestions: [
      '反复出现的工作模式是什么？优势型还是盲区型居多？',
      '在哪些任务或场景中情绪最正面/最负面？',
      '是否有可识别的职业优势（如"主动选择风险"）或盲区（如"被暗示不够好"）？',
      '关键时刻的决策逻辑是什么？有没有可复用的框架？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '感情',
    title: '择偶定位',
    description: '复盘关系模式，发现真实的情感需求与择偶偏好，看清什么是"对的人"',
    keyQuestions: [
      '在关系中反复被触发的是什么？是安全感、边界还是理解？',
      '过去的吸引模式是互补型还是相似型？结果怎样？',
      '关系中你最在意的是什么？（陪伴/尊重/共同成长/自由）',
      '是否存在关系盲区（如"边界被侵犯但选择了沉默"）？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '健康',
    title: '健康画像',
    description: '识别身体健康规律与心理压力触发点，发现自愈习惯与健康盲区',
    keyQuestions: [
      '身体在什么情况下会发出警告信号？',
      '压力来源是什么？有没有周期性的模式？',
      '什么样的自我照顾行为是有效的（运动/休息/社交/独处）？',
      '健康记录中是维护行为多还是问题处理多？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '财务',
    title: '财务行为模式',
    description: '分析收支习惯与消费心理，识别金钱信念与风险偏好',
    keyQuestions: [
      '消费行为背后的情绪触发是什么？（焦虑/奖励/社交压力）',
      '收入-支出决策是计划性的还是应激性的？',
      '财务决策中是否存在"省钱但吃亏"或"花钱但后悔"的循环？',
      '风险偏好是积极型、保守型还是混合型？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '决策',
    title: '决策风格分析',
    description: '分析决策逻辑，识别常见决策陷阱与有效决策框架',
    keyQuestions: [
      '决策时倾向于理性权衡还是直觉选择？',
      '卡住的决策通常卡在什么类型的问题上？（职业/关系/财务/生活方式）',
      '事后验证判断的准确性如何？有没有反复后悔的类型？',
      '用了哪些决策框架？哪些真正帮助了你？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '模式',
    title: '行为模式洞察',
    description: '识别反复出现的行为循环与触发-反应链路，发现可打破的模式',
    keyQuestions: [
      '哪些模式在反反复复出现？触发条件是什么？',
      '模式的结果是连续的还是偶尔的？有没有突破案例？',
      '同一个模式在不同场景下表现是否一致？',
      '目前已有对策的实际执行效果如何？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '洞察',
    title: '认知成长轨迹',
    description: '追踪顿悟时刻与认知转变，可视化你的思考进化路径',
    keyQuestions: [
      '这个月有哪些"想通了"的时刻？带来了什么改变？',
      '认知转变是否有阶段性特征？（看了某本书/经历了某件事后）',
      '哪些以前纠结的问题现在不纠结了？什么改变了？',
      '思维框架是否在升级？能看到一年前的认知局限吗？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
  {
    tag: '梦境',
    title: '梦境主题分析',
    description: '捕捉反复出现的梦境主题与情绪底色，连接潜意识与现实',
    keyQuestions: [
      '反复出现的梦境主题是什么？（考试/迷路/飞翔/追逐/坠落）',
      '梦中的情绪基调是什么？和醒来时的生活状态有关联吗？',
      '梦境中的人物/场景是否有现实映射？',
      '记梦频率和睡眠质量/压力水平是否相关？',
    ],
    patternTypes: ['positive', 'blind_spot'],
  },
];

/** O(1) 标签查找表 */
export const TAG_FRAMEWORK_MAP: Partial<Record<EventTag, TagFramework>> =
  Object.fromEntries(TAG_FRAMEWORKS.map(f => [f.tag, f])) as any;
