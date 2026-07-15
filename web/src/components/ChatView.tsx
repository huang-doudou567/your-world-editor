import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useChatStore } from '../stores/chat-store'
import { useJournalStore } from '../stores/journal-store'
import { useUIStore } from '../stores/ui-store'
import { Bookmark, Send, ChevronLeft, ChevronRight, Square, RefreshCw, Plus, Quote, Key, PencilLine, Wifi } from 'lucide-react'
import { getApiBase, getApiKey, setApiKey, hasCustomKey } from '../chat/api-client'
import { getExpiredMessages, cleanupChatMessages, type PersistedMessage } from '../data/db'

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
  const { messages, input, setInput, send, isStreaming, stopGenerating, retryMessage, clearMessages, recordUserMessage, saveSuggestedRecord, initMessages, quoteTextToJournal } = useChatStore()
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
  const apiConfigured = !!getApiKey()

  const openApiConfig = () => {
    setApiConfigInput(hasCustomKey() ? getApiKey() : '')
    setShowApiConfig(true)
  }
  const saveApiConfig = async () => {
    const key = apiConfigInput.trim()
    if (!key) {
      setApiKey('')
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
      if (res.ok) { setApiKey(key); setShowApiConfig(false); return }
    } catch { /* 网络问题，仍保存 */ }
    setTestingKey(false)
    setApiKey(key)
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

  // ── 初始化：加载历史对话 + 过期清理检查 ──
  const [showCleanup, setShowCleanup] = useState(false)
  const [expiredMsgs, setExpiredMsgs] = useState<PersistedMessage[]>([])
  const [keepIds, setKeepIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    initMessages()
    getExpiredMessages().then(exps => {
      if (exps.length > 0) {
        setExpiredMsgs(exps)
        setKeepIds(new Set(exps.map(m => m.id)))
        setShowCleanup(true)
      }
    })
  }, [])

  const doCleanup = () => {
    cleanupChatMessages([...keepIds]).then(() => {
      setShowCleanup(false)
      initMessages()
    })
  }
  const toggleKeep = (id: string) => {
    const next = new Set(keepIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setKeepIds(next)
  }
  const selectAllKeep = () => setKeepIds(new Set(expiredMsgs.map(m => m.id)))
  const deselectAllKeep = () => setKeepIds(new Set())

  // ── 文本选取引用为记录 ──
  const [selectionPopup, setSelectionPopup] = useState<{ msgId: string; text: string; x: number; y: number } | null>(null)
  const handleTextSelection = (msgId: string, e: React.MouseEvent) => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 5) { setSelectionPopup(null); return }
    const el = e.currentTarget as HTMLElement
    if (sel && el.contains(sel.anchorNode)) {
      setSelectionPopup({ msgId: msgId || '', text, x: e.clientX, y: e.clientY })
    }
  }
  const handleQuoteSelection = () => {
    if (!selectionPopup) return
    quoteTextToJournal(selectionPopup.text, selectionPopup.msgId)
    setSelectionPopup(null)
    window.getSelection()?.removeAllRanges()
  }

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
      {/* ── 过期对话清理弹窗 ── */}
      {showCleanup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCleanup(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 animate-slideUp" onClick={e => e.stopPropagation()}>
            <p className="font-serif text-lg text-navy mb-2">对话清理提醒</p>
            <p className="text-sm text-muted mb-4">
              以下 {expiredMsgs.length} 条对话已超过 7 天。默认勾选所有对话，<strong>取消勾选你希望留存的对话</strong>，点击确认后未勾选的将被永久删除。
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 mb-4 border border-line rounded-lg">
              {expiredMsgs.slice(0, 50).map(m => (
                <label key={m.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-cream/50 text-xs ${keepIds.has(m.id) ? '' : 'opacity-40 line-through'}`}>
                  <input type="checkbox" checked={keepIds.has(m.id)} onChange={() => toggleKeep(m.id)} className="accent-navy" />
                  <span className="text-muted font-mono">{m.timestamp.slice(0, 10)}</span>
                  <span className="text-navy/60 truncate">{m.content.slice(0, 50)}</span>
                  <span className="text-muted/40 ml-auto flex-shrink-0">{m.role === 'user' ? '👤' : '🤖'}</span>
                </label>
              ))}
              {expiredMsgs.length > 50 && <p className="text-[10px] text-muted text-center py-2">... 及 {expiredMsgs.length - 50} 条更早记录</p>}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={selectAllKeep} className="text-[10px] text-muted hover:text-navy px-2 py-1 rounded border border-line">全选</button>
              <button onClick={deselectAllKeep} className="text-[10px] text-muted hover:text-navy px-2 py-1 rounded border border-line">全不选</button>
              <span className="text-[10px] text-muted ml-auto">{keepIds.size}/{expiredMsgs.length} 条留存</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCleanup(false)} className="px-4 py-2 text-sm text-muted border border-line rounded-lg">稍后处理</button>
              <button onClick={doCleanup} className="px-4 py-2 text-sm bg-navy text-cream rounded-lg hover:bg-navy-light">
                确认清理（删除 {expiredMsgs.length - keepIds.size} 条）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 文本选取引用浮层 ── */}
      {selectionPopup && (
        <button
          onPointerDown={(e) => { e.preventDefault(); handleQuoteSelection() }}
          className="fixed z-50 flex items-center gap-1.5 px-3 py-1.5 bg-navy text-cream rounded-full shadow-lg text-xs animate-fadeIn hover:bg-navy-light transition-colors"
          style={{ left: selectionPopup.x, top: selectionPopup.y + 16 }}
        >
          <PencilLine size={12} />
          引用为事件记录
        </button>
      )}

      {/* Chat header */}
      <div className="px-6 py-4 border-b border-line bg-cream/80 backdrop-blur flex-shrink-0 flex items-center justify-between gap-4">
        <div>
          <p className="font-serif text-lg text-navy">对话 · 你的世界编辑器</p>
          <p className="text-xs text-muted mt-0.5">
            {isStreaming ? '正在生成回复…' : '说话就行，不用记命令。试试「记一下」「搜一下」「推演一下」'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Deno 后端状态 / Key 配置 */}
          <button
            onClick={openApiConfig}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs transition-all ${
              apiConfigured
                ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
            }`}
            title={apiConfigured ? '直连 DeepSeek — 点击修改' : '后端已连接 — 点击设置自定义 Key'}
          >
            {apiConfigured ? <Key size={12} /> : <Wifi size={12} />}
            {apiConfigured ? '直连' : '已连接'}
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

      {/* API 配置弹窗 */}
      {showApiConfig && (
        <div className="px-6 py-3 border-b border-line bg-cream-2/80 animate-fadeIn">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Wifi size={16} className="text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-navy font-medium">AI 后端状态 · Deno Deploy</p>
              <p className="text-[11px] text-muted mt-0.5">
                Key 在服务器环境变量安全存储，前端不可见。
                如需用自己的 Key 直连 DeepSeek（避免共享额度），在下方输入。
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="password"
                  value={apiConfigInput}
                  onChange={e => setApiConfigInput(e.target.value)}
                  placeholder={hasCustomKey() ? 'sk-xxxxxxxx' : '输入自定义 Key 切换直连（留空恢复后端）'}
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
              <p className="text-[10px] text-muted/50 mt-1.5">后端：{getApiBase()}</p>
              <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 underline mt-0.5 inline-block">
                去 DeepSeek 获取自己的 Key →
              </a>
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
                {/* 用户时间戳 */}
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-[10px] font-mono text-muted/40">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
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
                {/* AI 时间戳 */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono text-muted/40">
                    AI · {msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    {msg.usage && <span className="ml-2 text-muted/30">{msg.usage.input_tokens + msg.usage.output_tokens} tokens</span>}
                  </span>
                </div>
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap select-text" onMouseUp={(e) => !msg.isStreaming && handleTextSelection(msg.id, e)}>
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

                {/* AI 消息操作栏：引用 + 已选取引用标记 */}
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
                  {msg.quotedRef && (
                    <span className="text-[10px] text-green-500/70 font-mono bg-green-50 px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1"
                      title={`已选取引用：${msg.quotedRef}`}>
                      <PencilLine size={9} /> 已引用至流水账
                    </span>
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
