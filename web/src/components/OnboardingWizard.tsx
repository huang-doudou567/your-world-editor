import { useState } from 'react'
import { useUIStore } from '../stores/ui-store'

const STEPS = [
  {
    title: '📍 第 1 个问题',
    question: '你的昵称是？',
    hint: '起个称呼，系统会用这个名字称呼你。',
  },
  {
    title: '📍 第 2 个问题',
    question: '文件放在哪？',
    hint: '推荐：当前项目目录下「人生系统/」。网页版已自动为你创建。',
  },
  {
    title: '📍 第 3 个问题（最关键）',
    question: '有没有关于"你这个人"的资料可以投喂？',
    hint: '简历 / 自我介绍 / MBTI / 朋友画像 / 成长经历……\n\n💡 投喂越全，「模式与盲点」越准。最好同时有 ✅ 闪光 + ❌ 栽过的坑。\n\n网页版使用预设演示数据。在真实版本中说「搭建」开始。',
  },
  {
    title: '📍 第 4 个问题',
    question: '你平时收集书摘/金句吗？',
    hint: '下次栽进同一个坑，递回来的不是 AI 鸡汤，是你自己划过的那句话。\n\n在对话框里直接说「收藏xxx」即可记入金句库。',
  },
  {
    title: '📍 试一句吧',
    question: '直接说：记一下，今天 ___',
    hint: '去「对话」页试试。说「记一下，今天…」系统会自动判断是否值得记录、标情绪窗格、扫描模式。',
  },
  {
    title: '✨ 引导完成',
    question: '',
    hint: '',
  },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [nickname, setNickname] = useState('')
  const { setView } = useUIStore()

  if (step === 5) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center max-w-md px-6 animate-slideUp">
          <p className="text-5xl mb-6">✨</p>
          <h2 className="font-serif text-3xl text-navy mb-4">
            {nickname || '你'}～引导完成
          </h2>
          <p className="text-muted mb-8 leading-relaxed">
            还可以探索：<br/>
            📝 记流水账 · 🔍 检索回忆 · 🎯 辅助决策<br/>
            🧭 决策推演 · 📚 沉淀叙事 · 🪞 周复盘 · 📊 系统评估
          </p>
          <button
            onClick={() => setView('chat')}
            className="px-8 py-3 bg-navy text-cream rounded-xl font-serif text-lg hover:bg-navy-light transition-colors"
          >
            开始对话
          </button>
        </div>
      </div>
    )
  }

  const s = STEPS[step]

  return (
    <div className="h-full flex items-center justify-center bg-cream">
      <div className="max-w-md w-full px-6 animate-fadeIn" key={step}>
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-navy' : 'bg-line'}`} />
          ))}
        </div>

        <p className="text-xs font-mono text-muted mb-2">{s.title}</p>
        <h2 className="font-serif text-2xl text-navy mb-4">{s.question}</h2>
        <p className="text-sm text-muted leading-relaxed mb-8 whitespace-pre-wrap">{s.hint}</p>

        {step === 0 && (
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="你的昵称..."
            className="w-full bg-white border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy/30 mb-6"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && nickname.trim()) setStep(1) }}
          />
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 border border-line rounded-xl text-sm text-muted hover:border-navy/20 transition-colors"
            >
              上一步
            </button>
          )}
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !nickname.trim()}
            className="px-6 py-2.5 bg-navy text-cream rounded-xl text-sm hover:bg-navy-light transition-colors disabled:opacity-30 ml-auto"
          >
            {step === 4 ? '完成' : '继续'}
          </button>
        </div>
      </div>
    </div>
  )
}
