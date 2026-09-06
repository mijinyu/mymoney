import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import { ChevronLeft, PlusIcon, TrashIcon, EditIcon, CloseIcon } from '../components/icons'
import { CATEGORY_EMOJIS, DEFAULT_CATEGORY_EMOJI } from '../lib/emojis'

export default function Categories() {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_CATEGORY_EMOJI)
  const [editingId, setEditingId] = useState<number | null>(null)
  const cats = useLiveQuery(
    () => db.categories.where('kind').equals(kind).sortBy('order'),
    [kind]
  )

  function resetForm() {
    setEditingId(null)
    setName('')
    setEmoji(DEFAULT_CATEGORY_EMOJI)
  }

  function startEdit(c: { id?: number; name: string; emoji?: string }) {
    setEditingId(c.id ?? null)
    setName(c.name)
    setEmoji(c.emoji || DEFAULT_CATEGORY_EMOJI)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save() {
    const nm = name.trim()
    if (!nm) return
    if (editingId != null) {
      // 이름이 바뀌면 기존 거래의 분류명도 함께 갱신 (통계 일관성)
      const prev = (cats || []).find((c) => c.id === editingId)
      await db.categories.update(editingId, { name: nm, emoji })
      if (prev && prev.name !== nm) {
        await db.transactions
          .filter((t) => t.category === prev.name)
          .modify({ category: nm })
      }
    } else {
      const max = (cats || []).reduce((m, c) => Math.max(m, c.order || 0), 0)
      await db.categories.add({ name: nm, emoji, kind, order: max + 1 })
    }
    resetForm()
  }

  async function del(id?: number) {
    if (id == null) return
    if (!confirm('이 분류를 삭제할까요?')) return
    await db.categories.delete(id)
    if (editingId === id) resetForm()
  }

  const isEditing = editingId != null

  return (
    <div className="pt-safe">
      <header className="px-5 pt-6 pb-4 flex items-center gap-2">
        <Link to="/more" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-extrabold">카테고리 관리</h1>
      </header>

      <div className="px-5">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['expense', 'income'] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setKind(k)
                resetForm()
              }}
              className={`py-2.5 rounded-xl font-bold text-sm ${
                kind === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {k === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        {/* 추가 / 수정 폼 */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-700">
              {isEditing ? '분류 수정' : '새 분류 추가'}
            </p>
            {isEditing && (
              <button
                onClick={resetForm}
                className="text-xs text-slate-400 flex items-center gap-0.5"
              >
                <CloseIcon width={14} height={14} /> 취소
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            <span className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">
              {emoji}
            </span>
            <input
              className="input flex-1"
              value={name}
              placeholder={isEditing ? '분류 이름' : '새 카테고리 이름'}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button
              className="btn-primary px-4 shrink-0 disabled:opacity-40"
              disabled={!name.trim()}
              onClick={save}
            >
              {isEditing ? '수정' : <PlusIcon width={18} height={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-1.5">이모지 선택</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto overscroll-contain">
            {CATEGORY_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-9 h-9 rounded-lg text-lg shrink-0 ${
                  emoji === e ? 'bg-brand/15 ring-1 ring-brand' : 'bg-slate-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="card divide-y divide-slate-50">
          {cats?.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                editingId === c.id ? 'bg-brand/5' : ''
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="flex-1 font-medium">{c.name}</span>
              <button
                onClick={() => startEdit(c)}
                className="p-1.5 text-slate-300 hover:text-slate-600"
                aria-label="수정"
              >
                <EditIcon width={18} height={18} />
              </button>
              <button
                onClick={() => del(c.id)}
                className="p-1.5 text-slate-300 hover:text-rose-500"
                aria-label="삭제"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          ))}
          {cats && cats.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              카테고리가 없어요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
