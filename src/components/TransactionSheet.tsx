import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Transaction, TxType, Account } from '../db/types'
import { Sheet, Field, MoneyInput } from './ui'
import { todayStr } from '../lib/format'
import { TransferIcon } from './icons'
import { recognizeImage } from '../lib/ocr'
import { parseReceipt } from '../lib/parseReceipt'

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

  // 사진(OCR) 인식 상태
  const fileRef = useRef<HTMLInputElement>(null)
  const [ocrState, setOcrState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrRaw, setOcrRaw] = useState('')
  const [showRaw, setShowRaw] = useState(false)

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
    }
    setOcrState('idle')
    setOcrProgress(0)
    setOcrRaw('')
    setShowRaw(false)
  }, [open, editing])

  // 사진에서 거래 정보 자동 추출
  async function handleImage(file: File) {
    setOcrState('loading')
    setOcrProgress(0)
    try {
      const text = await recognizeImage(file, (p) => setOcrProgress(p))
      const parsed = parseReceipt(text)
      setOcrRaw(parsed.raw)
      setType(parsed.type)
      if (parsed.amount) setAmount(parsed.amount)
      if (parsed.date) setDate(parsed.date)
      if (parsed.merchant) setMemo(parsed.merchant)
      // 카드사/은행 힌트로 결제수단 자동 매칭
      if (parsed.cardHint && accounts) {
        const hit = accounts.find(
          (a) =>
            a.name.includes(parsed.cardHint!) ||
            (parsed.cardHint!.length >= 2 && a.name.replace(/\s/g, '').includes(parsed.cardHint!))
        )
        if (hit) setAccountId(hit.id)
      }
      setOcrState('done')
    } catch (e) {
      console.error(e)
      setOcrState('error')
    }
  }

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
          {/* 사진으로 자동 채우기 */}
          {!editing && (
            <div className="mb-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImage(f)
                  e.target.value = ''
                }}
              />
              {ocrState === 'loading' ? (
                <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
                  <p className="text-sm font-semibold text-brand mb-2">
                    사진 인식 중… {Math.round(ocrProgress * 100)}%
                  </p>
                  <div className="h-2 rounded-full bg-brand/15 overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${Math.max(5, ocrProgress * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    처음 한 번은 인식 데이터를 받느라 조금 걸려요.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-brand font-semibold text-sm flex items-center justify-center gap-2 active:scale-[.99] transition"
                >
                  📷 영수증·결제알림 사진으로 채우기
                </button>
              )}

              {ocrState === 'done' && (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700">
                    사진에서 불러왔어요. <b>금액·가맹점이 틀릴 수 있으니</b> 확인 후 저장해 주세요.
                  </p>
                  {ocrRaw && (
                    <button
                      type="button"
                      onClick={() => setShowRaw((v) => !v)}
                      className="text-xs text-amber-600 underline mt-1"
                    >
                      {showRaw ? '인식된 원문 숨기기' : '인식된 원문 보기'}
                    </button>
                  )}
                  {showRaw && (
                    <pre className="text-[11px] text-slate-500 whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">
                      {ocrRaw}
                    </pre>
                  )}
                </div>
              )}
              {ocrState === 'error' && (
                <p className="mt-2 text-xs text-rose-500">
                  사진을 인식하지 못했어요. 더 또렷한 사진으로 다시 시도하거나 직접 입력해 주세요.
                </p>
              )}
            </div>
          )}

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
