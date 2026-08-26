import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Account, AccountType, GroupMember } from '../db/types'
import { Sheet, Field, MoneyInput } from './ui'
import { TrashIcon } from './icons'

const COLORS = [
  '#16a34a', '#0ea5e9', '#6366f1', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#64748b',
]

const typeOptions: { key: AccountType; label: string; emoji: string }[] = [
  { key: 'card', label: '카드', emoji: '💳' },
  { key: 'bank', label: '은행', emoji: '🏦' },
  { key: 'cash', label: '현금', emoji: '💵' },
  { key: 'group', label: '모임통장', emoji: '👥' },
]

export function AccountSheet({
  open,
  onClose,
  editing,
  initialType = 'bank',
}: {
  open: boolean
  onClose: () => void
  editing?: Account
  initialType?: AccountType
}) {
  const banks = useLiveQuery(
    () => db.accounts.filter((a) => a.type === 'bank' && !a.archived).toArray(),
    []
  )

  const [type, setType] = useState<AccountType>(initialType)
  const [name, setName] = useState('')
  const [opening, setOpening] = useState(0)
  const [color, setColor] = useState(COLORS[0])
  // card
  const [benefitTarget, setBenefitTarget] = useState(0)
  const [withdrawalDay, setWithdrawalDay] = useState<number | ''>('')
  const [linkedBankId, setLinkedBankId] = useState<number | ''>('')
  // bank
  const [bankName, setBankName] = useState('')
  // group
  const [members, setMembers] = useState<GroupMember[]>([])
  const [newMember, setNewMember] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setName(editing.name)
      setOpening(editing.openingBalance)
      setColor(editing.color)
      if (editing.type === 'card') {
        setBenefitTarget(editing.benefitTarget || 0)
        setWithdrawalDay(editing.withdrawalDay ?? '')
        setLinkedBankId(editing.linkedBankId ?? '')
      }
      if (editing.type === 'bank') setBankName(editing.bankName || '')
      if (editing.type === 'group') setMembers(editing.members || [])
    } else {
      setType(initialType)
      setName('')
      setOpening(0)
      setColor(COLORS[0])
      setBenefitTarget(0)
      setWithdrawalDay('')
      setLinkedBankId('')
      setBankName('')
      setMembers([])
      setNewMember('')
    }
  }, [open, editing, initialType])

  async function save() {
    if (!name.trim()) return
    const commonBase = {
      name: name.trim(),
      openingBalance: opening,
      color,
      createdAt: editing?.createdAt ?? Date.now(),
    }
    let payload: Account
    if (type === 'card') {
      payload = {
        ...commonBase,
        type: 'card',
        benefitTarget: benefitTarget || undefined,
        withdrawalDay: withdrawalDay === '' ? undefined : Number(withdrawalDay),
        linkedBankId: linkedBankId === '' ? undefined : Number(linkedBankId),
      }
    } else if (type === 'bank') {
      payload = { ...commonBase, type: 'bank', bankName: bankName || undefined }
    } else if (type === 'group') {
      payload = { ...commonBase, type: 'group', members }
    } else {
      payload = { ...commonBase, type: 'cash' }
    }
    if (editing?.id) await db.accounts.update(editing.id, payload)
    else await db.accounts.add(payload)
    onClose()
  }

  function addMember() {
    const n = newMember.trim()
    if (!n || members.some((m) => m.name === n)) return
    setMembers([...members, { name: n }])
    setNewMember('')
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? '자산 수정' : '자산 추가'}>
      {/* 유형 선택 (수정 시 잠금) */}
      <Field label="종류">
        <div className="grid grid-cols-4 gap-2">
          {typeOptions.map((t) => (
            <button
              key={t.key}
              disabled={!!editing}
              onClick={() => setType(t.key)}
              className={`py-2.5 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 transition ${
                type === t.key
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-500'
              } ${editing ? 'opacity-70' : ''}`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="이름">
        <input
          className="input"
          value={name}
          placeholder={
            type === 'card'
              ? '예: 삼성 taptap'
              : type === 'bank'
                ? '예: 국민 주거래'
                : type === 'group'
                  ? '예: 제주도 여행통장'
                  : '예: 지갑 현금'
          }
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      {type === 'bank' && (
        <Field label="은행명 (선택)">
          <input
            className="input"
            value={bankName}
            placeholder="예: 국민은행"
            onChange={(e) => setBankName(e.target.value)}
          />
        </Field>
      )}

      {/* 카드는 '초기 잔액' 대신 개념이 달라 숨김 */}
      {type !== 'card' && (
        <Field
          label="현재 잔액"
          hint="지금 들어있는 금액을 적어주세요. 이후 거래로 자동 계산돼요."
        >
          <MoneyInput value={opening} onChange={setOpening} />
        </Field>
      )}

      {type === 'card' && (
        <>
          <Field
            label="이번 달 실적(혜택) 목표"
            hint="이만큼 써야 혜택을 받는 금액이에요. 없으면 0."
          >
            <MoneyInput value={benefitTarget} onChange={setBenefitTarget} />
          </Field>
          <div className="flex gap-3">
            <Field label="출금일 (매월)">
              <input
                type="number"
                min={1}
                max={31}
                className="input"
                placeholder="예: 14"
                value={withdrawalDay}
                onChange={(e) =>
                  setWithdrawalDay(e.target.value ? Number(e.target.value) : '')
                }
              />
            </Field>
            <Field label="출금 계좌">
              <select
                className="input"
                value={linkedBankId}
                onChange={(e) =>
                  setLinkedBankId(e.target.value ? Number(e.target.value) : '')
                }
              >
                <option value="">선택 안 함</option>
                {banks?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      {type === 'group' && (
        <Field label="참여자">
          <div className="flex gap-2 mb-2">
            <input
              className="input"
              value={newMember}
              placeholder="이름 입력 후 추가"
              onChange={(e) => setNewMember(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
            />
            <button className="btn-ghost px-4" onClick={addMember}>
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.name}
                className="chip bg-slate-100 border-slate-200 text-slate-600 flex items-center gap-1"
              >
                {m.name}
                <button
                  onClick={() =>
                    setMembers(members.filter((x) => x.name !== m.name))
                  }
                  className="text-slate-400"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </span>
            ))}
          </div>
        </Field>
      )}

      <Field label="색상">
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition ${
                color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>

      <button
        className="btn-primary w-full mt-2 disabled:opacity-40"
        disabled={!name.trim()}
        onClick={save}
      >
        {editing ? '수정하기' : '추가하기'}
      </button>
    </Sheet>
  )
}
