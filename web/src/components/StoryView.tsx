import { useState } from 'react'
import { useStoryStore } from '../stores/story-store'
import { BookOpen, Edit3, Save } from 'lucide-react'

export default function StoryView() {
  const { sections, updateSections } = useStoryStore()
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const handleEdit = (idx: number) => {
    setEditIdx(idx)
    setEditText(sections[idx].body)
  }

  const handleSave = async () => {
    if (editIdx === null) return
    const updated = [...sections]
    updated[editIdx] = { ...updated[editIdx], body: editText }
    await updateSections(updated)
    setEditIdx(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-line">
        <p className="font-serif text-lg text-navy">我的故事</p>
        <p className="text-xs text-muted mt-0.5">判断框架 · 金句 · 短诗 · 人生叙事主库</p>
      </div>
      <div className="p-6 max-w-3xl space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-white border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base text-navy flex items-center gap-2">
                <BookOpen size={16} />
                {s.title}
              </h3>
              <button
                onClick={() => editIdx === i ? handleSave() : handleEdit(i)}
                className="flex items-center gap-1 text-xs text-muted/50 hover:text-navy transition-colors"
              >
                {editIdx === i ? <Save size={13} /> : <Edit3 size={13} />}
                {editIdx === i ? '保存' : '编辑'}
              </button>
            </div>
            {editIdx === i ? (
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full min-h-[120px] bg-cream border border-line rounded-lg p-3 text-sm font-sans resize-y focus:outline-none focus:border-navy/30"
              />
            ) : (
              <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
                {s.body || '（空——在对话中记录金句、短诗和价值观，这里会慢慢长出来）'}
              </div>
            )}
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-center text-muted py-12">还没有叙事内容。去「对话」页记录金句、短诗吧。</p>
        )}
      </div>
    </div>
  )
}
