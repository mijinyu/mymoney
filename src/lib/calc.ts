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

// ===== 할부 계산 =====
export function isInstallment(tx: Transaction): boolean {
  return !!tx.installmentMonths && tx.installmentMonths >= 2
}

/** 'YYYY-MM' 형식의 두 달 차이 (a - b) */
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (ay - by) * 12 + (am - bm)
}

/** 할부의 특정 회차(0-index) 청구금액. 마지막 회차는 반올림 잔액을 흡수 */
function installmentPortion(total: number, months: number, seqIndex: number): number {
  const base = Math.floor(total / months)
  if (seqIndex >= months - 1) return total - base * (months - 1)
  return base
}

/**
 * 지출 거래가 특정 월(month, 'YYYY-MM')에 실제로 청구되는 금액.
 * - 일반 결제: 결제월에 전액
 * - 할부: 결제월부터 N개월간 매달 분할 청구
 */
export function expenseChargeInMonth(tx: Transaction, month: string): number {
  if (tx.type !== 'expense') return 0
  if (isInstallment(tx)) {
    const start = tx.date.slice(0, 7)
    const idx = monthDiff(month, start)
    if (idx < 0 || idx >= tx.installmentMonths!) return 0
    return installmentPortion(tx.amount, tx.installmentMonths!, idx)
  }
  return tx.date.startsWith(month) ? tx.amount : 0
}

/**
 * 카드 계좌의 "이번 달 사용액(청구 예정)". 할부는 그 달 분할분만 포함.
 */
export function cardSpentInMonth(
  cardId: number,
  txs: Transaction[],
  month: string
): number {
  return txs
    .filter((t) => t.type === 'expense' && t.accountId === cardId)
    .reduce((s, t) => s + expenseChargeInMonth(t, month), 0)
}

/** 카드 실적(혜택) 채운 금액 = 이번 달 청구되는 카드 지출 중 countsForBenefit !== false */
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
        t.countsForBenefit !== false
    )
    .reduce((s, t) => s + expenseChargeInMonth(t, month), 0)
}

export interface MonthSummary {
  income: number
  expense: number
  net: number
}

/** 월 수입/지출 요약. 할부는 그 달 분할분만 지출로 반영 */
export function monthSummary(
  txs: Transaction[],
  month: string,
  opts: { excludeCardWithdrawal?: boolean } = {}
): MonthSummary {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') {
      if (t.date.startsWith(month)) income += t.amount
    } else if (t.type === 'expense') {
      if (opts.excludeCardWithdrawal && t.isCardWithdrawal) continue
      expense += expenseChargeInMonth(t, month)
    }
  }
  return { income, expense, net: income - expense }
}

/** 이번 달 카테고리별 지출 집계 (할부는 그 달 분할분) */
export function categoryBreakdown(
  txs: Transaction[],
  month: string
): Array<{ category: string; amount: number }> {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    if (t.isCardWithdrawal) continue // 카드값 이중계산 방지
    const charge = expenseChargeInMonth(t, month)
    if (charge <= 0) continue
    const key = t.category || '기타'
    map.set(key, (map.get(key) || 0) + charge)
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

// ===== 할부 잔여 현황 =====
export interface InstallmentStatus {
  tx: Transaction
  months: number
  monthly: number
  /** 지금까지 낸 회차 수 (currentMonth 포함) */
  paidCount: number
  /** 남은 회차 수 */
  remainingCount: number
  /** 남은 금액 */
  remainingAmount: number
}

/** 특정 카드의 진행 중인 할부 목록 (currentMonth 기준으로 아직 안 끝난 것) */
export function cardInstallments(
  cardId: number,
  txs: Transaction[],
  currentMonth: string
): InstallmentStatus[] {
  return txs
    .filter(
      (t) => t.type === 'expense' && t.accountId === cardId && isInstallment(t)
    )
    .map((t) => {
      const months = t.installmentMonths!
      const start = t.date.slice(0, 7)
      const elapsed = monthDiff(currentMonth, start) // 결제월이면 0
      const paidCount = Math.max(0, Math.min(months, elapsed + 1))
      const remainingCount = Math.max(0, months - paidCount)
      let remainingAmount = 0
      for (let i = paidCount; i < months; i++) {
        remainingAmount += installmentPortion(t.amount, months, i)
      }
      return {
        tx: t,
        months,
        monthly: Math.floor(t.amount / months),
        paidCount,
        remainingCount,
        remainingAmount,
      }
    })
    .filter((s) => s.remainingCount > 0)
    .sort((a, b) => (a.tx.date < b.tx.date ? -1 : 1))
}

/** 카드의 남은 할부 총액 */
export function cardInstallmentRemaining(
  cardId: number,
  txs: Transaction[],
  currentMonth: string
): { total: number; count: number } {
  const list = cardInstallments(cardId, txs, currentMonth)
  return {
    total: list.reduce((s, i) => s + i.remainingAmount, 0),
    count: list.length,
  }
}
