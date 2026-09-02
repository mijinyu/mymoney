import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Transaction, TxType } from '../db/types'
import {
  monthSummary,
  categoryBreakdown,
  isInstallment,
  monthDiff,
  expenseChargeInMonth,
} from '../lib/calc'
import {
  won,
  currentMonth,
  monthLabel,
  addMonth,
  dateLabel,
} from '../lib/format'
import { useAddTx } from '../components/Layout'
import { Empty } from '../components/ui'
import { ChevronLeft, ChevronRight, TrashIcon, ListIcon } from '../components/icons'

const CAT_COLORS = [
  '#16a34a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#64748b',
]

type FilterKind = 'all' | TxType

interface HistoryEntry {
  key: string
  tx: Transaction
  date: string
  amount: number
  seq?: number
  total?: number
}

export default function History() {
  const [month, setMonth] = useState(currentMonth())
  const [filter, setFilter] = useState<FilterKind>('all')
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const allTxs = useLiveQuery(() => db.transactions.toArray(), [])
  const openTx = useAddTx()

  const accName = (id?: number) =>
    accounts?.find((a) => a.id === id)?.name ?? '삭제됨'

  const summary = useMemo(
    () => (allTxs ? monthSummary(allTxs, month, { excludeCardWithdrawal: true }) : null),
    [allTxs, month]
  )
  const breakdown = useMemo(
    () => (allTxs ? categoryBreakdown(allTxs, month) : []),
    [allTxs, month]
  )
  const totalExpense = breakdown.reduce((s, b) => s + b.amount, 0)

  // 이번 달에 실제로 잡히는 항목으로 펼침 (지난달 할부의 이번 달 청구분 포함)
  const entries = useMemo<HistoryEntry[]>(() => {
    if (!allTxs) return []
    const out: HistoryEntry[] = []
    for (const t of allTxs) {
      if (t.type === 'expense' && isInstallment(t)) {
        const idx = monthDiff(month, t.date.slice(0, 7))
        if (idx < 0 || idx >= t.installmentMonths!) continue
        out.push({
          key: `${t.id}-${idx}`,
          tx: t,
          date: `${month}-${t.date.slice(8, 10)}`,
          amount: expenseChargeInMonth(t, month),
          seq: idx + 1,
          total: t.installmentMonths,
        })
      } else if (t.date.startsWith(month)) {
        out.push({ key: String(t.id), tx: t, date: t.date, amount: t.amount })
      }
    }
    const list =
      filter === 'all' ? out : out.filter((e) => e.tx.type === filter)
    return list.sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.tx.createdAt - a.tx.createdAt
    )
  }, [allTxs, month, filter])

  // 날짜별 그룹핑
  const byDate = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>()
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()]
  }, [entries])

  async function del(e: HistoryEntry) {
    const msg = e.total
      ? '이 할부 거래 전체를 삭제할까요? (모든 회차가 함께 삭제돼요)'
      : '이 거래를 삭제할까요?'
    if (!confirm(msg)) return
    await db.transactions.delete(e.tx.id!)
  }

  return (
    <div className="pt-safe">
      {/* 월 스위처 */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <button
          onClick={() => setMonth(addMonth(month, -1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-lg font-extrabold">{monthLabel(month)}</h1>
        <button
          onClick={() => setMonth(addMonth(month, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronRight />
        </button>
      </header>

      {/* 요약 */}
      <section className="px-5">
        <div className="card p-4 flex gap-1">
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs text-slate-400 mb-1">수입</p>
            <p className="font-bold text-blue-600 text-sm whitespace-nowrap">
              {won(summary?.income ?? 0)}
            </p>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs text-slate-400 mb-1">지출</p>
            <p className="font-bold text-rose-600 text-sm whitespace-nowrap">
              {won(summary?.expense ?? 0)}
            </p>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs text-slate-400 mb-1">합계</p>
            <p
              className={`font-bold text-sm whitespace-nowrap ${
                (summary?.net ?? 0) >= 0 ? 'text-slate-800' : 'text-rose-600'
              }`}
            >
              {won(summary?.net ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {/* 카테고리별 지출 통계 */}
      {breakdown.length > 0 && (
        <section className="px-5 mt-4">
          <h2 className="font-bold text-slate-700 mb-2 text-sm">카테고리별 지출</h2>
          <div className="card p-4">
            {/* 가로 막대 */}
            <div className="flex h-3 rounded-full overflow-hidden mb-4">
              {breakdown.map((b, i) => (
                <div
                  key={b.category}
                  style={{
                    width: `${(b.amount / totalExpense) * 100}%`,
                    background: CAT_COLORS[i % CAT_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div className="space-y-2.5">
              {breakdown.map((b, i) => (
                <div key={b.category} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                  />
                  <span className="text-slate-600 flex-1">{b.category}</span>
                  <span className="text-slate-400 text-xs">
                    {Math.round((b.amount / totalExpense) * 100)}%
                  </span>
                  <span className="font-semibold w-24 text-right">
                    {won(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 필터 */}
      <section className="px-5 mt-5">
        <div className="flex gap-2 mb-3">
          {(
            [
              ['all', '전체'],
              ['expense', '지출'],
              ['income', '수입'],
              ['transfer', '이체'],
            ] as [FilterKind, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`chip ${
                filter === k
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {byDate.length === 0 ? (
          <Empty
            icon={<ListIcon width={36} height={36} />}
            text="이 달의 내역이 없어요"
          />
        ) : (
          <div className="space-y-4">
            {byDate.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-slate-400 mb-1.5 px-1">
                  {dateLabel(date)}
                </p>
                <div className="card divide-y divide-slate-50">
                  {items.map((e) => {
                    const t = e.tx
                    return (
                      <div
                        key={e.key}
                        className="flex items-center gap-3 px-4 py-3 group"
                        onClick={() => t.type !== 'transfer' && openTx(t)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {t.type === 'transfer'
                              ? `${accName(t.accountId)} → ${accName(t.toAccountId)}`
                              : t.memo || t.category || '내역'}
                            {e.total ? (
                              <span className="ml-1 text-[11px] font-semibold text-indigo-500">
                                할부 {e.seq}/{e.total}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {t.type === 'transfer' ? '이체' : accName(t.accountId)}
                            {t.category && t.type !== 'transfer' ? ` · ${t.category}` : ''}
                            {t.isAllowance ? ' · 용돈' : ''}
                          </p>
                        </div>
                        <p
                          className={`font-bold text-sm ${
                            t.type === 'income'
                              ? 'text-blue-600'
                              : t.type === 'expense'
                                ? 'text-rose-600'
                                : 'text-slate-500'
                          }`}
                        >
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                          {won(e.amount)}
                        </p>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            del(e)
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500"
                        >
                          <TrashIcon width={16} height={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
