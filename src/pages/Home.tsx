import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import {
  accountBalance,
  monthSummary,
  allowanceSpent,
  upcomingCardBills,
} from '../lib/calc'
import { won, currentMonth, monthLabel, daysUntil } from '../lib/format'
import { Progress } from '../components/ui'
import { CardIcon, PiggyIcon, ArrowRight, CoinIcon } from '../components/icons'
import type { CardAccount } from '../db/types'

export default function Home() {
  const month = currentMonth()
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const txs = useLiveQuery(() => db.transactions.toArray(), [])
  const allowance = useLiveQuery(
    () => db.allowances.where('month').equals(month).first(),
    [month]
  )
  const goals = useLiveQuery(() => db.goals.toArray(), [])

  if (!accounts || !txs) return <div className="p-6 text-slate-400">불러오는 중…</div>

  const active = accounts.filter((a) => !a.archived)
  // 자산 합계: 은행+현금+모임 (카드는 부채로 별도)
  const assetTotal = active
    .filter((a) => a.type !== 'card')
    .reduce((s, a) => s + accountBalance(a, txs), 0)

  const cards = active.filter((a): a is CardAccount => a.type === 'card')
  const bills = upcomingCardBills(cards, txs, month)
  const totalCardBill = bills.reduce((s, b) => s + b.amount, 0)

  const summary = monthSummary(txs, month, { excludeCardWithdrawal: true })
  const allowanceUsed = allowanceSpent(txs, month)
  const allowanceLeft = (allowance?.amount ?? 0) - allowanceUsed

  const recent = [...txs]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
    .slice(0, 6)

  const accName = (id?: number) => active.find((a) => a.id === id)?.name ?? '삭제됨'

  return (
    <div className="pt-safe">
      {/* 헤더 */}
      <header className="px-5 pt-6 pb-4">
        <p className="text-sm text-slate-400">{monthLabel(month)}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">나만의 가계부</h1>
      </header>

      {/* 자산 요약 카드 */}
      <section className="px-5">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-emerald-500 text-white p-5 shadow-lg shadow-brand/20">
          <p className="text-sm text-white/80">전체 자산 (카드값 제외)</p>
          <p className="text-3xl font-extrabold mt-1">{won(assetTotal)}</p>
          <div className="flex gap-3 mt-4">
            <div className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
              <p className="text-xs text-white/80">이번 달 수입</p>
              <p className="font-bold">{won(summary.income)}</p>
            </div>
            <div className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
              <p className="text-xs text-white/80">이번 달 지출</p>
              <p className="font-bold">{won(summary.expense)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 다가오는 카드값 */}
      <section className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800">💳 다가오는 카드값</h2>
          <span className="text-sm font-bold text-rose-600">{won(totalCardBill)}</span>
        </div>
        {bills.length === 0 ? (
          <div className="card px-4 py-4 text-sm text-slate-400 text-center">
            등록된 카드가 없어요
          </div>
        ) : (
          <div className="space-y-2">
            {bills.map((b) => {
              const target = b.card.benefitTarget || 0
              const progress = b.amount
              const left = daysUntil(b.day || 1)
              return (
                <div key={b.card.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ background: b.card.color }}
                      >
                        <CardIcon width={18} height={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{b.card.name}</p>
                        {b.day && (
                          <p className="text-xs text-slate-400">
                            매월 {b.day}일 출금 · {left}일 남음
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-slate-800">{won(b.amount)}</p>
                  </div>
                  {target > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>실적 {won(progress)} / {won(target)}</span>
                        <span
                          className={
                            progress >= target ? 'text-brand font-semibold' : ''
                          }
                        >
                          {progress >= target
                            ? '실적 달성 ✓'
                            : `${won(target - progress)} 더`}
                        </span>
                      </div>
                      <Progress value={progress} max={target} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 용돈 */}
      <section className="px-5 mt-5">
        <Link to="/allowance" className="card p-4 flex items-center gap-3 active:bg-slate-50">
          <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <CoinIcon width={22} height={22} />
          </span>
          <div className="flex-1">
            <p className="text-sm text-slate-500">이번 달 남은 용돈</p>
            {allowance?.amount ? (
              <p
                className={`font-bold text-lg ${allowanceLeft < 0 ? 'text-rose-600' : 'text-slate-800'}`}
              >
                {won(allowanceLeft)}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {won(allowance.amount)}
                </span>
              </p>
            ) : (
              <p className="font-semibold text-slate-400">용돈 예산을 설정해 보세요</p>
            )}
          </div>
          <ArrowRight className="text-slate-300" width={20} height={20} />
        </Link>
      </section>

      {/* 저축 목표 */}
      {goals && goals.length > 0 && (
        <section className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-800">🎯 저축 목표</h2>
            <Link to="/goals" className="text-xs text-slate-400">
              전체보기
            </Link>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 2).map((g) => (
              <div key={g.id} className="card p-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-slate-500">
                    {won(g.savedAmount)} / {won(g.targetAmount)}
                  </span>
                </div>
                <Progress value={g.savedAmount} max={g.targetAmount} color={g.color} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 최근 내역 */}
      <section className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800">최근 내역</h2>
          <Link to="/history" className="text-xs text-slate-400">
            전체보기
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-slate-400">
            아래 <span className="text-brand font-bold">＋</span> 버튼으로 첫 거래를 입력해 보세요
          </div>
        ) : (
          <div className="card divide-y divide-slate-50">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {t.type === 'transfer'
                      ? `${accName(t.accountId)} → ${accName(t.toAccountId)}`
                      : t.memo || t.category || '내역'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.date.slice(5).replace('-', '.')} ·{' '}
                    {t.type === 'transfer' ? '이체' : accName(t.accountId)}
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
                  {won(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="h-4" />
        <Link
          to="/goals"
          className="card p-4 flex items-center gap-3 active:bg-slate-50 text-slate-700"
        >
          <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <PiggyIcon width={22} height={22} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm">돈 모으기 목표 만들기</p>
            <p className="text-xs text-slate-400">카드값 줄이고 목표 금액까지!</p>
          </div>
          <ArrowRight className="text-slate-300" width={20} height={20} />
        </Link>
      </section>
    </div>
  )
}
