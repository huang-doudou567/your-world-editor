import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from '../stores/chat-store'
import { Send, ChevronLeft, ChevronRight } from 'lucide-react'

const PROMPTS = [
  '记一下，今天___',
  '搜一下：上次我跟___',
  '推演一下，我在纠结___',
  '照镜子，这周怎么样',
  '我这周住在哪个窗格',
  '收藏：___',
  '系统评估，效果怎么样',
  '记一下，刚刚做了一个梦___',
  '帮我分析：要不要___',
  '整理一下最近的记录',
  'Merge 一下',
  '记个事：___',
]

export default function ChatView() {
  const { messages, input, setInput, send } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [promptIdx, setPromptIdx] = useState(0)

  // ── Resizable input area ──
  const [inputHeight, setInputHeight] = useState(140)
  const dragRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startH.current = inputHeight
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [inputHeight])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      setInputHeight(Math.max(100, Math.min(400, startH.current + delta)))
    }
    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Prompt carousel ──
  useEffect(() => {
    const t = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS.length), 3000)
    return () => clearInterval(t)
  }, [])

  const prevPrompt = () => setPromptIdx(i => (i - 1 + PROMPTS.length) % PROMPTS.length)
  const nextPrompt = () => setPromptIdx(i => (i + 1) % PROMPTS.length)
  const usePrompt = (p: string) => { setInput(p); send() }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="px-6 py-4 border-b border-line bg-cream/80 backdrop-blur flex-shrink-0">
        <p className="font-serif text-lg text-navy">对话 · 你的世界编辑器</p>
        <p className="text-xs text-muted mt-0.5">说话就行，不用记命令。试试「记一下」「搜一下」「推演一下」</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {messages.map(msg => (
          <div key={msg.id} className={`animate-fadeIn ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] md:max-w-[70%] bg-navy text-cream rounded-2xl rounded-br-md px-5 py-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[85%] md:max-w-[75%]">
                {msg.thinking && msg.thinking.length > 0 && (
                  <div className="mb-2 space-y-0.5">
                    {msg.thinking.map((t, i) => (
                      <p key={i} className="text-[11px] text-muted/50 font-mono">{t}</p>
                    ))}
                  </div>
                )}
                <div className="bg-white border border-line rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'system' && (
                  <p className="text-[10px] text-muted/30 font-mono mt-1 ml-1 tracking-wider uppercase">
                    模拟回复 · 非真实 AI
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Drag handle ── */}
      <div
        ref={dragRef}
        onMouseDown={onMouseDown}
        className="flex-shrink-0 h-2 cursor-row-resize hover:bg-navy/5 transition-colors flex items-center justify-center group"
        title="拖动调节输入区高度"
      >
        <div className="w-10 h-1 rounded-full bg-line group-hover:bg-navy/20 transition-colors" />
      </div>

      {/* ── Input area (resizable) ── */}
      <div className="flex-shrink-0 border-t border-line bg-cream" style={{ height: inputHeight }}>
        <div className="h-full flex flex-col px-4 md:px-8 py-3">
          {/* Prompt carousel */}
          <div className="flex items-center gap-1 mb-2 flex-shrink-0">
            <button onClick={prevPrompt} className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted/30 hover:text-muted transition-colors">
              <ChevronLeft size={14} />
            </button>
            <div className="flex-1 overflow-hidden relative h-8">
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
                <button
                  onClick={() => usePrompt(PROMPTS[promptIdx])}
                  className="text-xs text-muted/50 hover:text-navy hover:underline transition-colors cursor-pointer whitespace-nowrap"
                  title="点击直接发送"
                >
                  💡 {PROMPTS[promptIdx]}
                </button>
              </div>
            </div>
            <button onClick={nextPrompt} className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted/30 hover:text-muted transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 flex items-end gap-3 max-w-3xl mx-auto w-full bg-white border border-line rounded-2xl px-4 py-3 focus-within:border-navy/30 transition-colors min-h-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说话就行…（Enter 发送，Shift+Enter 换行）"
              className="flex-1 resize-none bg-transparent border-none outline-none text-sm placeholder:text-muted/40 font-sans h-full"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-navy text-cream disabled:opacity-20 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-muted/30 text-center mt-1.5 font-mono tracking-wider flex-shrink-0">
            💡 你的世界编辑器 · 交互演示版 · AI 回复为关键词模拟
          </p>
        </div>
      </div>
    </div>
  )
}
