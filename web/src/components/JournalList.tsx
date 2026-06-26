import { useState } from 'react'
import { useJournalStore } from '../stores/journal-store'
import { TAG_OPTIONS } from '../engine/types'
import type { Event, EventTag } from '../engine/types'
import { Trash2, Edit3, Save, X } from 'lucide-react'

const EMOTION_LABEL: Record<string, string> = { colorful: '🎨', bright: '💡', dark: '🌑' }
const EMOTION_OPTIONS: { value: Event['emotion']; label: string }[] = [
  { value: 'colorful', label: '🎨 彩色' },
  { value: 'bright', label: '💡 明亮' },
  { value: 'dark', label: '🌑 黑暗' },
]

export default function JournalList() {
  const { entries, removeEntry, updateEntry } = useJournalStore()
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [editTag, setEditTag] = useState<EventTag>('')
  const [editEmotion, setEditEmotion] = useState<Event['emotion']>('bright')
  const [editMode, setEditMode] = useState<Event['mode']>('')

  const startEdit = (e: Event) => {
    setEditId(e.id!)
    setEditTitle(e.title)
    setEditText(e.text)
    setEditTag(e.tag)
    setEditEmotion(e.emotion)
    setEditMode(e.mode)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditTitle('')
    setEditText('')
    setEditTag('')
    setEditEmotion('bright')
    setEditMode('')
  }

  const saveEdit = async (original: Event) => {
    if (!editId) return
    await updateEntry({
      ...original,
      title: editTitle,
      text: editText,
      tag: editTag,
      emotion: editEmotion,
      mode: editMode,
    })
    cancelEdit()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">经历流水账</p>
        <p className="text-xs text-muted mt-0.5">所有记录的事件 · 倒序排列 · 共 {entries.length} 条 · 点击 ✏️ 编辑</p>
      </div>
      <div className="p-6 max-w-3xl space-y-4">
        {entries.map(e => {
          const editing = editId === e.id
          return (
            <div key={e.id || e.timestamp} className="bg-white border border-line rounded-xl p-5 animate-fadeIn">
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted">{e.timestamp}</span>
                  {!editing ? (
                    <>
                      <span>{EMOTION_LABEL[e.emotion] || ''}</span>
                      {e.tag && (
                        <span className="text-[10px] font-mono bg-soft-blue px-1.5 py-0.5 rounded text-navy">
                          {TAG_OPTIONS.find(t => t.value === e.tag)?.emoji} {e.tag}
                        </span>
                      )}
                      {e.mode && <span className="text-sm">{e.mode}</span>}
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <button onClick={cancelEdit} className="text-muted/40 hover:text-muted transition-colors">
                        <X size={14} />
                      </button>
                      <button onClick={() => saveEdit(e)} className="text-navy hover:text-green-600 transition-colors">
                        <Save size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(e)} className="text-muted/30 hover:text-navy transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => removeEntry(e.id!)} className="text-muted/30 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing ? (
                /* Edit mode */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-cream border border-line rounded-lg px-3 py-2 text-sm font-serif focus:outline-none focus:border-navy/30"
                    placeholder="标题"
                  />
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full bg-cream border border-line rounded-lg px-3 py-2 text-sm resize-y min-h-[60px] focus:outline-none focus:border-navy/30"
                    placeholder="正文"
                    rows={2}
                  />

                  {/* Tag selector */}
                  <div>
                    <p className="text-[10px] font-mono text-muted/60 mb-2">标签</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_OPTIONS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setEditTag(t.value)}
                          className={`px-2.5 py-1 rounded text-xs transition-all ${
                            editTag === t.value
                              ? 'bg-navy text-cream'
                              : 'bg-cream border border-line text-muted hover:border-navy/20'
                          }`}
                        >
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Emotion selector */}
                  <div>
                    <p className="text-[10px] font-mono text-muted/60 mb-2">情绪窗格</p>
                    <div className="flex gap-1.5">
                      {EMOTION_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setEditEmotion(o.value)}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            editEmotion === o.value
                              ? 'bg-navy text-cream'
                              : 'bg-cream border border-line text-muted hover:border-navy/20'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div>
                    <p className="text-[10px] font-mono text-muted/60 mb-2">模式标记</p>
                    <div className="flex gap-1.5">
                      {(['', '❌', '✅'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setEditMode(m)}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            editMode === m
                              ? 'bg-navy text-cream'
                              : 'bg-cream border border-line text-muted hover:border-navy/20'
                          }`}
                        >
                          {m || '无'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <>
                  <h3 className="font-serif text-base text-navy mb-1">{e.title}</h3>
                  {e.text && <p className="text-sm text-muted leading-relaxed">{e.text}</p>}
                  {e.patternRefs.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {e.patternRefs.map(p => (
                        <span key={p} className="text-[10px] font-mono bg-gold/30 px-1.5 py-0.5 rounded text-navy">
                          关联: {p}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
        {entries.length === 0 && (
          <p className="text-center text-muted py-12">还没有记录。去「对话」页记第一条吧。</p>
        )}
      </div>
    </div>
  )
}
