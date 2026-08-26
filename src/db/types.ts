// ===== 자산(계좌) 종류 =====
export type AccountType = 'card' | 'bank' | 'cash' | 'group'

// 공통 계좌 필드
export interface BaseAccount {
  id?: number
  type: AccountType
  name: string
  /** 개설 시 초기 잔액. 현재 잔액은 거래내역으로 계산됨 */
  openingBalance: number
  color: string
  archived?: boolean
  createdAt: number
  order?: number
}

// 은행 계좌
export interface BankAccount extends BaseAccount {
  type: 'bank'
  bankName?: string
  accountNumber?: string
}

// 현금
export interface CashAccount extends BaseAccount {
  type: 'cash'
}

// 카드
export interface CardAccount extends BaseAccount {
  type: 'card'
  /** 실적(혜택) 목표 금액 — 이만큼 써야 혜택을 받음 */
  benefitTarget?: number
  /** 매월 카드값이 빠지는 날 (1~31) */
  withdrawalDay?: number
  /** 카드값이 자동이체되는 은행 계좌 id */
  linkedBankId?: number
}

// 모임통장
export interface GroupMember {
  name: string
}
export interface GroupAccount extends BaseAccount {
  type: 'group'
  members: GroupMember[]
}

export type Account =
  | BankAccount
  | CashAccount
  | CardAccount
  | GroupAccount

// ===== 거래 =====
export type TxType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id?: number
  type: TxType
  /** YYYY-MM-DD */
  date: string
  amount: number
  /** 지출/수입의 대상 계좌. 이체에서는 '보내는' 계좌 */
  accountId: number
  /** 이체에서 '받는' 계좌 */
  toAccountId?: number
  category?: string
  memo?: string
  /** 용돈에서 차감되는 지출인지 */
  isAllowance?: boolean
  /** 카드 실적에 포함되는 지출인지 (카드 지출 기본 true) */
  countsForBenefit?: boolean
  /** 카드값 자동이체(출금) 기록인지 */
  isCardWithdrawal?: boolean
  /** 모임통장: 누가 낸/받은 돈인지 */
  memberName?: string
  createdAt: number
}

// ===== 용돈 예산 (월별) =====
export interface AllowanceBudget {
  id?: number
  /** YYYY-MM */
  month: string
  amount: number
}

// ===== 저축 목표 =====
export interface SavingsGoal {
  id?: number
  name: string
  targetAmount: number
  /** 직접 모은 금액 */
  savedAmount: number
  /** YYYY-MM-DD */
  deadline?: string
  color: string
  createdAt: number
}

// ===== 카테고리 =====
export interface Category {
  id?: number
  name: string
  kind: 'expense' | 'income'
  emoji?: string
  order?: number
}

// ===== 앱 설정 =====
export interface Setting {
  key: string
  value: string
}
