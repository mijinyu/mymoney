import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { SavingsGoal } from '../db/types'
import { won } from '../lib/format'
import { Sheet, Field, MoneyInput, Progress, Empty } from '../components/ui'
import { PiggyIcon, PlusIcon, TrashIcon, EditIcon } from '../components/icons'

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444']

export default function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | undefined>()

  // 입금(모으기) 시트
  const [depositFor, setDepositFor] = useState<SavingsGoal | undefined>()
  const [depositAmt, setDepositAmt] = useState(0)

  const [name, setName] = useState('')
  const [target, setTarget] = useState(0)
  const [saved, setSaved] = useState(0)
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState(COLORS[0])

  function openAdd() {
    setEditing(undefined)
    setName('')
    setTarget(0)
    setSaved(0)
    setDeadline('')
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
    setOpen(true)
  }
  function openEdit(g: SavingsGoal) {
    setEditing(g)
    setName(g.name)
    setTarget(g.targetAmount)
    setSaved(g.savedAmount)
    setDeadline(g.deadline || '')
    setColor(g.color)
    setOpen(true)
  }

  async function save() {
    if (!name.trim() || target <= 0) return
    const payload: SavingsGoal = {
      name: name.trim(),
      targetAmount: target,
      savedAmount: saved,
      deadline: deadline || undefined,
      color,
      createdAt: editing?.createdAt ?? Date.now(),
    }
    if (editing?.id) await db.goals.update(editing.id, payload)
    else await db.goals.add(payload)
    setOpen(false)
  }

  async function doDeposit() {
    if (!depositFor?.id || depositAmt <= 0) return
    await db.goals.update(depositFor.id, {
      savedAmount: depositFor.savedAmount + depositAmt,
    })
    setDepositFor(undefined)
    setDepositAmt(0)
  }

  async function remove(g: SavingsGoal) {
    if (!confirm(`'${g.name}' 목표를 삭제할까요?`)) return
    await db.goals.delete(g.id!)
  }

  return (
    <div className="pt-safe">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">저축 목표</h1>
          <p className="text-sm text-slate-400 mt-0.5">카드값 줄이고 돈 모으기 🎯</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-3 py-2 text-sm">
          <PlusIcon width={18} height={18} /> 목표
        </button>
      </header>

      <section className="px-5 space-y-3">
        {goals && goals.length === 0 && (
          <Empty
            icon={<PiggyIcon width={40} height={40} />}
            text="첫 저축 목표를 만들어 보세요"
          />
        )}
        {goals?.map((g) => {
          const pct = Math.min(100, (g.savedAmount / g.targetAmount) * 100)
          const done = g.savedAmount >= g.targetAmount
          return (
            <div key={g.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-lg">{g.name}</p>
                  {g.deadline && (
                    <p className="text-xs text-slate-400">목표일 {g.deadline}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(g)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <EditIcon width={18} height={18} />
                  </button>
                  <button
                    onClick={() => remove(g)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-extrabold" style={{ color: g.color }}>
                  {won(g.savedAmount)}
                </p>
                <p className="text-sm text-slate-400">/ {won(g.targetAmount)}</p>
              </div>
              <div className="mt-2">
                <Progress value={g.savedAmount} max={g.targetAmount} color={g.color} />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`text-sm font-semibold ${done ? 'text-brand' : 'text-slate-500'}`}
                >
                  {done ? '목표 달성! 🎉' : `${Math.round(pct)}% 달성`}
                </span>
                <button
                  onClick={() => {
                    setDepositFor(g)
                    setDepositAmt(0)
                  }}
                  className="text-sm font-semibold text-brand"
                >
                  + 모으기
                </button>
              </div>
            </div>
          )
        })}
      </section>

      {/* 추가/수정 */}
      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? '목표 수정' : '새 저축 목표'}>
        <Field label="목표 이름">
          <input
            className="input"
            value={name}
            placeholder="예: 비상금 만들기"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="목표 금액">
          <MoneyInput value={target} onChange={setTarget} />
        </Field>
        <Field label="이미 모은 금액">
          <MoneyInput value={saved} onChange={setSaved} />
        </Field>
        <Field label="목표일 (선택)">
          <input
            type="date"
            className="input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
        <Field label="색상">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
        <button
          className="btn-primary w-full disabled:opacity-40"
          disabled={!name.trim() || target <= 0}
          onClick={save}
        >
          {editing ? '수정하기' : '만들기'}
        </button>
      </Sheet>

      {/* 모으기(입금) */}
      <Sheet
        open={!!depositFor}
        onClose={() => setDepositFor(undefined)}
        title={`${depositFor?.name ?? ''} 에 모으기`}
      >
        <Field label="이번에 모을 금액">
          <MoneyInput value={depositAmt} onChange={setDepositAmt} autoFocus />
        </Field>
        <button
          className="btn-primary w-full disabled:opacity-40"
          disabled={depositAmt <= 0}
          onClick={doDeposit}
        >
          모으기
        </button>
      </Sheet>
    </div>
  )
}
