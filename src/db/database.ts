import Dexie, { type Table } from 'dexie'
import type {
  Account,
  Transaction,
  AllowanceBudget,
  SavingsGoal,
  Category,
  Setting,
} from './types'

// 로컬(IndexedDB) 데이터베이스.
// 나중에 클라우드 동기화를 붙일 때 이 계층 위에 sync 로직을 얹으면 됨.
export class MyMoneyDB extends Dexie {
  accounts!: Table<Account, number>
  transactions!: Table<Transaction, number>
  allowances!: Table<AllowanceBudget, number>
  goals!: Table<SavingsGoal, number>
  categories!: Table<Category, number>
  settings!: Table<Setting, string>

  constructor() {
    super('mymoney')
    this.version(1).stores({
      accounts: '++id, type, archived, order',
      transactions: '++id, date, type, accountId, toAccountId, isAllowance',
      allowances: '++id, &month',
      goals: '++id',
      categories: '++id, kind, order',
      settings: '&key',
    })
  }
}

export const db = new MyMoneyDB()

// 기본 카테고리 시드 (최초 실행 시 1회)
const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; emoji: string }> = [
  { name: '식비', emoji: '🍚' },
  { name: '카페/간식', emoji: '☕' },
  { name: '교통', emoji: '🚌' },
  { name: '생활/마트', emoji: '🛒' },
  { name: '주거/통신', emoji: '🏠' },
  { name: '문화/여가', emoji: '🎬' },
  { name: '쇼핑', emoji: '🛍️' },
  { name: '건강/의료', emoji: '💊' },
  { name: '경조사', emoji: '🎁' },
  { name: '카드값', emoji: '💳' },
  { name: '기타', emoji: '✏️' },
]
const DEFAULT_INCOME_CATEGORIES: Array<{ name: string; emoji: string }> = [
  { name: '월급', emoji: '💰' },
  { name: '용돈', emoji: '🧧' },
  { name: '부수입', emoji: '📈' },
  { name: '이자', emoji: '🏦' },
  { name: '기타수입', emoji: '✏️' },
]

export async function seedIfEmpty() {
  const count = await db.categories.count()
  if (count > 0) return
  let order = 0
  await db.categories.bulkAdd([
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
      name: c.name,
      emoji: c.emoji,
      kind: 'expense' as const,
      order: order++,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
      name: c.name,
      emoji: c.emoji,
      kind: 'income' as const,
      order: order++,
    })),
  ])
}
