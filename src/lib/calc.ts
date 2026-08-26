import type { Account, CardAccount, Transaction } from '../db/types'

// 거래가 특정 계좌 잔액에 미치는 영향(델타)을 계산
export function txDeltaForAccount(tx: Transaction, accountId: number): number {
  if (tx.type === 'income' && tx.accountId === accountId) return tx.amount
  if (tx.type === 'expense' && tx.accountId === accountId) return -tx.amount
  if (tx.type === 'transfer') {
    if (tx.accountId === accountId) return -tx.amount // 보내는 계좌
    if (tx.toAccountId === accountId) return tx.amount // 받는 계좌
  }
  return 0
}

/** 계좌의 현재 잔액 = 초기잔액 + 모든 거래 델타 합 */
export function accountBalance(account: Account, txs: Transaction[]): number {
  let bal = account.openingBalance || 0
  for (const tx of txs) {
    bal += txDeltaForAccount(tx, account.id!)
  }
  return bal
}

/**
 * 카드 계좌의 "이번 달 사용액(청구 예정)".
 * 카드로 결제한 지출(= accountId가 카드이고 expense) 중, 해당 월의 합계.
 */
export function cardSpentInMonth(
  cardId: number,
  txs: Transaction[],
  month: string
): number {
  return txs
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.accountId === cardId &&
        t.date.startsWith(month)
    )
    .reduce((s, t) => s + t.amount, 0)
}

/** 카드 실적(혜택) 채운 금액 = 이번 달 카드 지출 중 countsForBenefit !== false */
export function cardBenefitProgress(
  cardId: number,
  txs: Transaction[],
  month: string
): number {
  return txs
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.accountId === cardId &&
        t.countsForBenefit !== false &&
        t.date.startsWith(month)
    )
    .reduce((s, t) => s + t.amount, 0)
}

export interface MonthSummary {
  income: number
  expense: number
  net: number
}

/** 월 수입/지출 요약. 이체와 카드값(자동이체) 지출은 실지출에서 제외 옵션 */
export function monthSummary(
  txs: Transaction[],
  month: string,
  opts: { excludeCardWithdrawal?: boolean } = {}
): MonthSummary {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (!t.date.startsWith(month)) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') {
      // 카드값 자동이체는 이미 카드 지출로 잡혔으므로 이중계산 방지 위해 제외 가능
      if (opts.excludeCardWithdrawal && t.isCardWithdrawal) continue
      expense += t.amount
    }
  }
  return { income, expense, net: income - expense }
}

/** 이번 달 카테고리별 지출 집계 */
export function categoryBreakdown(
  txs: Transaction[],
  month: string
): Array<{ category: string; amount: number }> {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    if (!t.date.startsWith(month)) continue
    if (t.isCardWithdrawal) continue // 카드값 이중계산 방지
    const key = t.category || '기타'
    map.set(key, (map.get(key) || 0) + t.amount)
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/** 용돈 사용액(해당 월, isAllowance 지출 합계) */
export function allowanceSpent(txs: Transaction[], month: string): number {
  return txs
    .filter(
      (t) => t.type === 'expense' && t.isAllowance && t.date.startsWith(month)
    )
    .reduce((s, t) => s + t.amount, 0)
}

/** 카드값(청구예정) 총합 — 다가오는 지출 예측용 */
export function upcomingCardBills(
  cards: CardAccount[],
  txs: Transaction[],
  month: string
): Array<{ card: CardAccount; amount: number; day?: number }> {
  return cards
    .filter((c) => !c.archived)
    .map((c) => ({
      card: c,
      amount: cardSpentInMonth(c.id!, txs, month),
      day: c.withdrawalDay,
    }))
    .filter((r) => r.amount > 0 || r.day)
}
