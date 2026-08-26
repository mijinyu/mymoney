import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import { ChevronLeft, PlusIcon, TrashIcon } from '../components/icons'

const EMOJIS = ['🍚', '☕', '🚌', '🛒', '🏠', '🎬', '🛍️', '💊', '🎁', '💳', '💰', '🧧', '📈', '🏦', '✏️', '🍺', '⛽', '🐶', '📚', '💪']

export default function Categories() {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✏️')
  const cats = useLiveQuery(
    () => db.categories.where('kind').equals(kind).sortBy('order'),
    [kind]
  )

  async function add() {
    if (!name.trim()) return
    const max = (cats || []).reduce((m, c) => Math.max(m, c.order || 0), 0)
    await db.categories.add({ name: name.trim(), emoji, kind, order: max + 1 })
    setName('')
    setEmoji('✏️')
  }
  async function del(id?: number) {
    if (id == null) return
    await db.categories.delete(id)
  }

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
              onClick={() => setKind(k)}
              className={`py-2.5 rounded-xl font-bold text-sm ${
                kind === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {k === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        {/* 추가 */}
        <div className="card p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1"
              value={name}
              placeholder="새 카테고리 이름"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn-primary px-4" onClick={add}>
              <PlusIcon width={18} height={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-9 h-9 rounded-lg text-lg ${
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
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">{c.emoji}</span>
              <span className="flex-1 font-medium">{c.name}</span>
              <button
                onClick={() => del(c.id)}
                className="p-1.5 text-slate-300 hover:text-rose-500"
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
