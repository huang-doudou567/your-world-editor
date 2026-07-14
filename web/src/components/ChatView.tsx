import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useChatStore } from '../stores/chat-store'
import { useJournalStore } from '../stores/journal-store'
import { useUIStore } from '../stores/ui-store'
import { Bookmark, Send, ChevronLeft, ChevronRight, Square, RefreshCw, Plus, Quote, Key, KeyRound } from 'lucide-react'
import { getDeepSeekKey, setDeepSeekKey } from '../chat/api-client'

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
  '我意识到___',
  '今天心情特别好___',
  '又踩坑了：___',
  '做了一个决定___',
  '和老朋友聊了___',
  '最近老是___',
  '终于想通了___',
  '这次我选择了___',
]

export default function ChatView() {
  const { messages, input, setInput, send, isStreaming, stopGenerating, retryMessage, clearMessages, recordUserMessage, saveSuggestedRecord } = useChatStore()
  const entries = useJournalStore(s => s.entries)
  const setView = useUIStore(s => s.setView)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [promptIdx, setPromptIdx] = useState(0)

  // ── 引用回复 ──
  const [quoteRef, setQuoteRef] = useState<{ id: string; text: string } | null>(null)
  const quoteMessage = (id: string, text: string) => {
    setQuoteRef({ id, text })
    const currentInput = useChatStore.getState().input
    setInput(`> ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}\n\n${currentInput}`)
  }
  const cancelQuote = () => { setQuoteRef(null) }

  // ── DeepSeek API Key 配置 ──
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [apiConfigInput, setApiConfigInput] = useState('')
  const [testingKey, setTestingKey] = useState(false)
  const apiConfigured = !!getDeepSeekKey()

  const openApiConfig = () => {
    setApiConfigInput('')
    setShowApiConfig(true)
  }
  const saveApiConfig = async () => {
    const key = apiConfigInput.trim()
    if (!key) {
      setDeepSeekKey('')
      setShowApiConfig(false)
      return
    }
    if (!key.startsWith('sk-')) {
      setApiConfigInput('')
      return
    }
    setTestingKey(true)
    try {
      const res = await fetch('https://api.deepseek.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      })
      setTestingKey(false)
      if (res.ok) {
        setDeepSeekKey(key)
        setShowApiConfig(false)
        return
      }
    } catch { /* 网络问题，直接保存 */ }
    setTestingKey(false)
    setDeepSeekKey(key)
    setShowApiConfig(false)
  }

  // ── 情绪窗格指示器数据 ──
  const emotionSummary = useMemo(() => {
    const dist = { colorful: 0, bright: 0, dark: 0 }
    for (const e of entries) dist[e.emotion]++
    const total = dist.colorful + dist.bright + dist.dark
    if (total === 0) return null
    const dominant = dist.colorful >= dist.bright && dist.colorful >= dist.dark ? 'colorful'
      : dist.bright >= dist.dark ? 'bright' : 'dark'
    const emoji = { colorful: '🎨', bright: '💡', dark: '🌑' }[dominant]
    const label = { colorful: '彩色', bright: '明亮', dark: '黑暗' }[dominant]
    const pct = Math.round((dist[dominant] / total) * 100)
    return { dominant, emoji, label, pct, total, dist }
  }, [entries])

  // ── Resizable input area ──
  const [inputHeight, setInputHeight] = useState(140)
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
      if (!isStreaming) send()
    }
  }

  const hasMessages = messages.length > 1

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="px-6 py-4 border-b border-line bg-cream/80 backdrop-blur flex-shrink-0 flex items-center justify-between gap-4">
        <div>
          <p className="font-serif text-lg text-navy">对话 · 你的世界编辑器</p>
          <p className="text-xs text-muted mt-0.5">
            {isStreaming ? '正在生成回复…' : '说话就行，不用记命令。试试「记一下」「搜一下」「推演一下」'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* DeepSeek API Key 状态 */}
          <button
            onClick={openApiConfig}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs transition-all ${
              apiConfigured
                ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
            title={apiConfigured ? 'DeepSeek Key 已设置 — 点击修改' : '未设置 API Key — 点击输入'}
          >
            {apiConfigured ? <Key size={12} /> : <KeyRound size={12} />}
            {apiConfigured ? 'Key 已设' : '未设Key'}
          </button>
          {/* 情绪窗格快速指示 */}
          {emotionSummary && (
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-white hover:border-navy/20 transition-all text-xs"
              title={`${emotionSummary.total} 条记录 · 点击查看数据看板`}
            >
              <span className="text-sm">{emotionSummary.emoji}</span>
              <span className="text-navy/70">{emotionSummary.label}窗格</span>
              <span className="font-mono text-muted/50">{emotionSummary.pct}%</span>
            </button>
          )}
          {hasMessages && (
            <button
              onClick={clearMessages}
              className="flex items-center gap-1 text-xs text-muted/50 hover:text-muted transition-colors px-2 py-1 rounded-md hover:bg-navy/5"
              title="新对话"
            >
              <Plus size={14} />
              新对话
            </button>
          )}
        </div>
      </div>

      {/* DeepSeek API Key 配置弹窗 */}
      {showApiConfig && (
        <div className="px-6 py-3 border-b border-line bg-cream-2/80 animate-fadeIn">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <KeyRound size={16} className="text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-navy font-medium">设置 DeepSeek API Key</p>
              <p className="text-[11px] text-muted mt-0.5">
                前端直连 DeepSeek，无需后端服务器。Key 仅存在你浏览器 localStorage 中。
                <br />
                <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-blue-500 underline">去 DeepSeek 获取 Key →</a>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="password"
                  value={apiConfigInput}
                  onChange={e => setApiConfigInput(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-1.5 text-sm bg-white border border-line rounded-lg focus:outline-none focus:border-navy/30 font-mono"
                  onKeyDown={e => { if (e.key === 'Enter') saveApiConfig() }}
                  autoFocus
                />
                <button
                  onClick={saveApiConfig}
                  disabled={testingKey}
                  className="px-4 py-1.5 bg-navy text-cream text-sm rounded-lg hover:bg-navy-light transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {testingKey ? '验证中…' : '保存'}
                </button>
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="px-3 py-1.5 text-sm text-muted hover:text-navy transition-colors flex-shrink-0"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
        {messages.map(msg => (
          <div key={msg.id} className={`animate-fadeIn ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] md:max-w-[70%] group relative">
                <div className="bg-navy text-cream rounded-2xl rounded-br-md px-5 py-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                {/* 用户消息操作栏 */}
                <div className="flex items-center gap-1 mt-1 justify-end">
                  {msg.recordSaved ? (
                    <span className="text-[10px] text-green-500/80 font-mono flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      ✅ 已同步至流水账
                    </span>
                  ) : (
                    <button
                      onClick={() => recordUserMessage(msg.id)}
                      className="flex items-center gap-0.5 text-[10px] text-navy/60 hover:text-navy hover:bg-navy/5 font-mono px-2 py-0.5 rounded-full border border-line hover:border-navy/20 transition-all"
                      title="手动记下这条到流水账"
                    >
                      <Bookmark size={10} />
                      记下
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] md:max-w-[75%] group">
                {/* Thinking blocks */}
                {msg.thinking && (
                  <details className="mb-2" open={msg.isStreaming}>
                    <summary className="text-[11px] text-muted/50 font-mono cursor-pointer hover:text-muted/70">
                      💭 思考过程 {msg.isStreaming ? '' : `(${msg.thinking.length} 字)`}
                    </summary>
                    <div className="mt-1 pl-3 border-l-2 border-muted/20">
                      <p className="text-[11px] text-muted/40 font-mono whitespace-pre-wrap leading-relaxed">
                        {msg.thinking}
                      </p>
                    </div>
                  </details>
                )}

                <div className={`bg-white border border-line rounded-2xl rounded-bl-md px-5 py-3 shadow-sm ${msg.isStreaming ? 'ring-1 ring-navy/10' : ''}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-2 h-4 bg-navy/60 ml-0.5 animate-pulse align-middle" />}
                  </p>
                  {msg.error && (
                    <div className="mt-2 pt-2 border-t border-line/50 flex items-center gap-2">
                      <p className="text-xs text-red-400 flex-1">{msg.error}</p>
                      <button
                        onClick={() => retryMessage(msg.id)}
                        className="flex items-center gap-1 text-xs text-navy/60 hover:text-navy transition-colors"
                      >
                        <RefreshCw size={12} />
                        重试
                      </button>
                    </div>
                  )}
                </div>

                {/* AI 消息操作栏：引用 + 建议记录 */}
                <div className="flex items-center gap-1 mt-1">
                  {!msg.isStreaming && msg.content && (
                    <button
                      onClick={() => quoteMessage(msg.id, msg.content)}
                      className={`flex items-center gap-0.5 text-[10px] text-muted/40 hover:text-navy font-mono px-2 py-0.5 rounded-full border border-transparent hover:border-line hover:bg-white transition-all ${
                        quoteRef?.id === msg.id ? 'text-navy bg-navy/5 border-navy/20' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="引用此回复到输入框"
                    >
                      <Quote size={10} />
                      引用
                    </button>
                  )}
                </div>

                {/* AI 建议记录 → 可点击 chip */}
                {msg.suggestedRecord && !msg.recordSaved && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => saveSuggestedRecord(msg.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy/5 hover:bg-navy/10 border border-navy/10 transition-colors text-xs group/chip"
                    >
                      <Bookmark size={12} className="text-navy/40 group-hover/chip:text-navy transition-colors" />
                      <span className="text-navy/60 font-medium">
                        记下：{msg.suggestedRecord.title}
                      </span>
                      <span className="text-[10px] text-muted/40">
                        {msg.suggestedRecord.tag}
                      </span>
                      <span className="text-[10px]">
                        {{ colorful: '🎨', bright: '💡', dark: '🌑' }[msg.suggestedRecord.emotion]}
                      </span>
                    </button>
                  </div>
                )}
                {msg.recordSaved && msg.suggestedRecord && (
                  <p className="mt-1 text-[10px] text-green-500/60 font-mono">✅ 已记录「{msg.suggestedRecord.title}」</p>
                )}

                {/* Usage info */}
                {msg.usage && (
                  <p className="text-[10px] text-muted/30 font-mono mt-1 ml-1">
                    {msg.usage.input_tokens} → {msg.usage.output_tokens} tokens
                    {msg.usage.cache_read_input_tokens > 0 && (
                      <span className="text-green-600/40"> · 缓存命中 {msg.usage.cache_read_input_tokens}</span>
                    )}
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

          {/* 引用预览条 */}
          {quoteRef && (
            <div className="flex items-center gap-2 max-w-3xl mx-auto w-full mb-1 px-3 py-1.5 bg-navy/5 rounded-lg border border-navy/10 animate-fadeIn">
              <Quote size={12} className="text-navy/50 flex-shrink-0" />
              <span className="text-xs text-navy/60 flex-1 truncate">
                引用：{quoteRef.text.slice(0, 80)}{quoteRef.text.length > 80 ? '…' : ''}
              </span>
              <button
                onClick={cancelQuote}
                className="text-xs text-muted/50 hover:text-red-400 transition-colors flex-shrink-0 font-mono"
              >
                ✕ 取消引用
              </button>
            </div>
          )}

          {/* Text input */}
          <div className="flex-1 flex items-end gap-3 max-w-3xl mx-auto w-full bg-white border border-line rounded-2xl px-4 py-3 focus-within:border-navy/30 transition-colors min-h-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? '正在生成回复…' : '说话就行…（Enter 发送，Shift+Enter 换行）'}
              className="flex-1 resize-none bg-transparent border-none outline-none text-sm placeholder:text-muted/40 font-sans h-full"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                onClick={stopGenerating}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-red-400 text-white transition-colors hover:bg-red-500"
                title="停止生成"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-navy text-cream disabled:opacity-20 transition-opacity"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted/30 text-center mt-1.5 font-mono tracking-wider flex-shrink-0">
            💡 你的世界编辑器 · 由 DeepSeek 驱动
          </p>
        </div>
      </div>
    </div>
  )
}
