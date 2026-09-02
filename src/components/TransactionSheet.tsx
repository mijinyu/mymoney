import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Transaction, TxType, Account } from '../db/types'
import { Sheet, Field, MoneyInput } from './ui'
import { todayStr } from '../lib/format'
import { TransferIcon } from './icons'

const typeTabs: { key: TxType; label: string; color: string }[] = [
  { key: 'expense', label: '지출', color: 'bg-rose-500' },
  { key: 'income', label: '수입', color: 'bg-blue-500' },
  { key: 'transfer', label: '이체', color: 'bg-slate-600' },
]

const accountLabel = (a: Account) => {
  const icon =
    a.type === 'card' ? '💳' : a.type === 'bank' ? '🏦' : a.type === 'cash' ? '💵' : '👥'
  return `${icon} ${a.name}`
}

export function TransactionSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Transaction
}) {
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.archived).toArray(),
    []
  )
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayStr())
  const [accountId, setAccountId] = useState<number | undefined>()
  const [toAccountId, setToAccountId] = useState<number | undefined>()
  const [category, setCategory] = useState<string>('')
  const [memo, setMemo] = useState('')
  const [isAllowance, setIsAllowance] = useState(false)
  const [countsForBenefit, setCountsForBenefit] = useState(true)
  const [memberName, setMemberName] = useState('')
  const [installmentMonths, setInstallmentMonths] = useState(1) // 1 = 일시불

  // 초기값 설정
  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount(editing.amount)
      setDate(editing.date)
      setAccountId(editing.accountId)
      setToAccountId(editing.toAccountId)
      setCategory(editing.category || '')
      setMemo(editing.memo || '')
      setIsAllowance(!!editing.isAllowance)
      setCountsForBenefit(editing.countsForBenefit !== false)
      setMemberName(editing.memberName || '')
      setInstallmentMonths(editing.installmentMonths || 1)
    } else {
      setType('expense')
      setAmount(0)
      setDate(todayStr())
      setAccountId(undefined)
      setToAccountId(undefined)
      setCategory('')
      setMemo('')
      setIsAllowance(false)
      setCountsForBenefit(true)
      setMemberName('')
      setInstallmentMonths(1)
    }
  }, [open, editing])

  const selectedAccount = accounts?.find((a) => a.id === accountId)
  const isCardSelected = selectedAccount?.type === 'card'
  const isGroupSelected = selectedAccount?.type === 'group'

  const cats = useMemo(
    () =>
      (categories || [])
        .filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories, type]
  )

  const canSave =
    amount > 0 &&
    accountId != null &&
    (type !== 'transfer' || (toAccountId != null && toAccountId !== accountId))

  async function save() {
    if (!canSave) return
    const payload: Transaction = {
      type,
      amount,
      date,
      accountId: accountId!,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      category: type === 'transfer' ? undefined : category || undefined,
      memo: memo || undefined,
      isAllowance: type === 'expense' ? isAllowance : undefined,
      countsForBenefit:
        type === 'expense' && isCardSelected ? countsForBenefit : undefined,
      installmentMonths:
        type === 'expense' && isCardSelected && installmentMonths >= 2
          ? installmentMonths
          : undefined,
      memberName: isGroupSelected ? memberName || undefined : undefined,
      createdAt: editing?.createdAt ?? Date.now(),
    }
    if (editing?.id) await db.transactions.update(editing.id, payload)
    else await db.transactions.add(payload)
    onClose()
  }

  const noAccounts = accounts && accounts.length === 0

  return (
    <Sheet open={open} onClose={onClose} title={editing ? '거래 수정' : '거래 입력'}>
      {noAccounts ? (
        <div className="py-8 text-center text-slate-500">
          <p className="mb-1">먼저 카드·은행·현금 등</p>
          <p>자산을 하나 이상 등록해 주세요.</p>
        </div>
      ) : (
        <>
          {/* 유형 탭 */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {typeTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`py-2.5 rounded-xl font-bold text-sm transition ${
                  type === t.key
                    ? `${t.color} text-white`
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Field label="금액">
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </Field>

          <Field label="날짜">
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          {type === 'transfer' ? (
            <div className="flex items-end gap-2">
              <Field label="보내는 곳">
                <select
                  className="input"
                  value={accountId ?? ''}
                  onChange={(e) => setAccountId(Number(e.target.value) || undefined)}
                >
                  <option value="">선택</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountLabel(a)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mb-6 text-slate-400">
                <TransferIcon />
              </div>
              <Field label="받는 곳">
                <select
                  className="input"
                  value={toAccountId ?? ''}
                  onChange={(e) => setToAccountId(Number(e.target.value) || undefined)}
                >
                  <option value="">선택</option>
                  {accounts
                    ?.filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {accountLabel(a)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
          ) : (
            <Field label={type === 'income' ? '받은 곳(입금 계좌)' : '결제 수단'}>
              <select
                className="input"
                value={accountId ?? ''}
                onChange={(e) => setAccountId(Number(e.target.value) || undefined)}
              >
                <option value="">선택</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* 카테고리 */}
          {type !== 'transfer' && (
            <Field label="분류">
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.name)}
                    className={`chip ${
                      category === c.name
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* 모임통장 참여자 */}
          {isGroupSelected && selectedAccount?.type === 'group' && (
            <Field label="참여자 (선택)">
              <select
                className="input"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              >
                <option value="">지정 안 함</option>
                {selectedAccount.members.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* 할부 (카드 지출 전용) */}
          {type === 'expense' && isCardSelected && (
            <Field label="할부">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 6, 9, 12, 24].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInstallmentMonths(m)}
                    className={`chip ${
                      installmentMonths === m
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {m === 1 ? '일시불' : `${m}개월`}
                  </button>
                ))}
              </div>
              {installmentMonths >= 2 && amount > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  매달 약 {Math.floor(amount / installmentMonths).toLocaleString('ko-KR')}원씩{' '}
                  {installmentMonths}개월 청구돼요.
                </p>
              )}
            </Field>
          )}

          {/* 옵션들 */}
          {type === 'expense' && (
            <div className="space-y-2 mb-4">
              <label className="flex items-center justify-between card px-4 py-3">
                <span className="text-sm font-medium text-slate-700">
                  🧧 용돈에서 차감
                </span>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-brand"
                  checked={isAllowance}
                  onChange={(e) => setIsAllowance(e.target.checked)}
                />
              </label>
              {isCardSelected && (
                <label className="flex items-center justify-between card px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    💳 카드 실적에 포함
                  </span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-brand"
                    checked={countsForBenefit}
                    onChange={(e) => setCountsForBenefit(e.target.checked)}
                  />
                </label>
              )}
            </div>
          )}

          <Field label="메모 (선택)">
            <input
              className="input"
              value={memo}
              placeholder="예: 점심 김밥"
              onChange={(e) => setMemo(e.target.value)}
            />
          </Field>

          <button
            className="btn-primary w-full mt-2 disabled:opacity-40"
            disabled={!canSave}
            onClick={save}
          >
            {editing ? '수정하기' : '저장하기'}
          </button>
        </>
      )}
    </Sheet>
  )
}
