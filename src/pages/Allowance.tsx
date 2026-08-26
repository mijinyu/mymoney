import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { allowanceSpent } from '../lib/calc'
import { won, currentMonth, monthLabel, addMonth } from '../lib/format'
import { Sheet, Field, MoneyInput, Empty } from '../components/ui'
import { ChevronLeft, ChevronRight, CoinIcon } from '../components/icons'

export default function Allowance() {
  const [month, setMonth] = useState(currentMonth())
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState(0)

  const budget = useLiveQuery(
    () => db.allowances.where('month').equals(month).first(),
    [month]
  )
  const txs = useLiveQuery(
    () => db.transactions.where('date').startsWith(month).toArray(),
    [month]
  )
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])

  const used = txs ? allowanceSpent(txs, month) : 0
  const total = budget?.amount ?? 0
  const left = total - used
  const overspent = left < 0

  const allowanceTxs = (txs || [])
    .filter((t) => t.type === 'expense' && t.isAllowance)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const accName = (id?: number) =>
    accounts?.find((a) => a.id === id)?.name ?? ''

  async function saveBudget() {
    if (budget?.id) {
      if (draft <= 0) await db.allowances.delete(budget.id)
      else await db.allowances.update(budget.id, { amount: draft })
    } else if (draft > 0) {
      await db.allowances.add({ month, amount: draft })
    }
    setEditOpen(false)
  }

  return (
    <div className="pt-safe">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <button
          onClick={() => setMonth(addMonth(month, -1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-extrabold">용돈</h1>
          <p className="text-xs text-slate-400">{monthLabel(month)}</p>
        </div>
        <button
          onClick={() => setMonth(addMonth(month, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronRight />
        </button>
      </header>

      <section className="px-5">
        <div
          className={`rounded-3xl p-6 text-white shadow-lg ${
            overspent
              ? 'bg-gradient-to-br from-rose-500 to-red-500'
              : 'bg-gradient-to-br from-amber-400 to-orange-500'
          }`}
        >
          <div className="flex items-center gap-2 text-white/90">
            <CoinIcon width={20} height={20} />
            <span className="text-sm">이번 달 남은 용돈</span>
          </div>
          <p className="text-4xl font-extrabold mt-2">{won(left)}</p>
          {total > 0 ? (
            <>
              <div className="mt-4">
                <div className="h-2.5 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (used / total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm mt-2 text-white/90">
                <span>사용 {won(used)}</span>
                <span>예산 {won(total)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/90 mt-2">
              아래에서 이번 달 용돈 예산을 정해보세요
            </p>
          )}
        </div>

        <button
          className="btn-ghost w-full mt-3"
          onClick={() => {
            setDraft(total)
            setEditOpen(true)
          }}
        >
          {total > 0 ? '용돈 예산 수정' : '용돈 예산 설정하기'}
        </button>
      </section>

      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-700">용돈 사용 내역</h2>
          <span className="text-xs text-slate-400">
            거래 입력 시 '용돈에서 차감'을 켜면 여기 쌓여요
          </span>
        </div>
        {allowanceTxs.length === 0 ? (
          <Empty text="아직 용돈 사용 내역이 없어요" />
        ) : (
          <div className="card divide-y divide-slate-50">
            {allowanceTxs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {t.memo || t.category || '용돈 지출'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.date.slice(5).replace('-', '.')} · {accName(t.accountId)}
                  </p>
                </div>
                <p className="font-bold text-sm text-rose-600">-{won(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="용돈 예산">
        <Field
          label={`${monthLabel(month)} 용돈`}
          hint="0으로 저장하면 예산이 삭제돼요."
        >
          <MoneyInput value={draft} onChange={setDraft} autoFocus />
        </Field>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[100000, 300000, 500000, 1000000].map((v) => (
            <button
              key={v}
              onClick={() => setDraft(v)}
              className="chip bg-slate-100 border-slate-200 text-slate-600"
            >
              {v / 10000}만
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={saveBudget}>
          저장하기
        </button>
      </Sheet>
    </div>
  )
}
