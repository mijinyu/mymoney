import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Account, AccountType, CardAccount, GroupAccount } from '../db/types'
import { accountBalance, cardSpentInMonth } from '../lib/calc'
import { won, currentMonth } from '../lib/format'
import { AccountSheet } from '../components/AccountSheet'
import { Progress, Empty } from '../components/ui'
import {
  CardIcon,
  BankIcon,
  CashIcon,
  GroupIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from '../components/icons'

const groups: { type: AccountType; title: string; Icon: (p: any) => JSX.Element }[] = [
  { type: 'card', title: '카드', Icon: CardIcon },
  { type: 'bank', title: '은행 계좌', Icon: BankIcon },
  { type: 'cash', title: '현금', Icon: CashIcon },
  { type: 'group', title: '모임통장', Icon: GroupIcon },
]

export default function Accounts() {
  const month = currentMonth()
  const accounts = useLiveQuery(() => db.accounts.toArray(), [])
  const txs = useLiveQuery(() => db.transactions.toArray(), [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>()
  const [initialType, setInitialType] = useState<AccountType>('bank')

  if (!accounts || !txs) return <div className="p-6 text-slate-400">불러오는 중…</div>

  const active = accounts.filter((a) => !a.archived)
  const totalAsset = active
    .filter((a) => a.type !== 'card')
    .reduce((s, a) => s + accountBalance(a, txs), 0)
  const totalCard = active
    .filter((a) => a.type === 'card')
    .reduce((s, a) => s + cardSpentInMonth(a.id!, txs, month), 0)

  function openAdd(type: AccountType) {
    setEditing(undefined)
    setInitialType(type)
    setSheetOpen(true)
  }
  function openEdit(a: Account) {
    setEditing(a)
    setSheetOpen(true)
  }
  async function remove(a: Account) {
    const hasTx = txs!.some(
      (t) => t.accountId === a.id || t.toAccountId === a.id
    )
    const msg = hasTx
      ? `'${a.name}'에 연결된 거래내역이 있어요. 자산을 삭제하면 거래도 함께 삭제됩니다. 계속할까요?`
      : `'${a.name}'을(를) 삭제할까요?`
    if (!confirm(msg)) return
    if (hasTx) {
      await db.transactions
        .filter((t) => t.accountId === a.id || t.toAccountId === a.id)
        .delete()
    }
    await db.accounts.delete(a.id!)
  }

  return (
    <div className="pt-safe">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">내 자산</h1>
        <div className="flex gap-3 mt-3">
          <div className="flex-1 card p-3">
            <p className="text-xs text-slate-400">총 자산</p>
            <p className="font-bold text-lg">{won(totalAsset)}</p>
          </div>
          <div className="flex-1 card p-3">
            <p className="text-xs text-slate-400">이번 달 카드값</p>
            <p className="font-bold text-lg text-rose-600">{won(totalCard)}</p>
          </div>
        </div>
      </header>

      {active.length === 0 && (
        <Empty
          icon={<BankIcon width={40} height={40} />}
          text="아직 등록한 자산이 없어요. 아래에서 추가해 보세요."
        />
      )}

      {groups.map(({ type, title, Icon }) => {
        const items = active.filter((a) => a.type === type)
        return (
          <section key={type} className="px-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Icon width={18} height={18} /> {title}
              </h2>
              <button
                onClick={() => openAdd(type)}
                className="text-sm text-brand font-semibold flex items-center gap-0.5"
              >
                <PlusIcon width={16} height={16} /> 추가
              </button>
            </div>

            {items.length === 0 ? (
              <button
                onClick={() => openAdd(type)}
                className="w-full card border-dashed border-2 border-slate-200 py-4 text-sm text-slate-400"
              >
                + {title} 추가하기
              </button>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    month={month}
                    balance={accountBalance(a, txs)}
                    cardSpent={
                      a.type === 'card' ? cardSpentInMonth(a.id!, txs, month) : 0
                    }
                    onEdit={() => openEdit(a)}
                    onDelete={() => remove(a)}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}

      <AccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        initialType={initialType}
        key={String(sheetOpen) + (editing?.id ?? 'new')}
      />
    </div>
  )
}

function AccountCard({
  account,
  balance,
  cardSpent,
  onEdit,
  onDelete,
}: {
  account: Account
  month: string
  balance: number
  cardSpent: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: account.color }}
        >
          {account.type === 'card' ? (
            <CardIcon width={20} height={20} />
          ) : account.type === 'bank' ? (
            <BankIcon width={20} height={20} />
          ) : account.type === 'cash' ? (
            <CashIcon width={20} height={20} />
          ) : (
            <GroupIcon width={20} height={20} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{account.name}</p>
          {account.type === 'card' ? (
            <p className="text-sm text-slate-500">
              이번 달 사용 <b className="text-rose-600">{won(cardSpent)}</b>
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              잔액 <b className="text-slate-800">{won(balance)}</b>
            </p>
          )}

          {account.type === 'card' && (account as CardAccount).benefitTarget ? (
            <div className="mt-2">
              <div className="flex justify-between gap-2 text-xs text-slate-400 mb-1 whitespace-nowrap">
                <span>목표 {won((account as CardAccount).benefitTarget!)}</span>
                <span className="text-slate-500 font-medium">
                  {cardSpent >= (account as CardAccount).benefitTarget!
                    ? '달성 ✓'
                    : `${won((account as CardAccount).benefitTarget! - cardSpent)} 남음`}
                </span>
              </div>
              <Progress
                value={cardSpent}
                max={(account as CardAccount).benefitTarget!}
                color={account.color}
              />
            </div>
          ) : null}

          {account.type === 'card' && (account as CardAccount).withdrawalDay ? (
            <p className="text-xs text-slate-400 mt-1.5">
              매월 {(account as CardAccount).withdrawalDay}일 출금
            </p>
          ) : null}

          {account.type === 'group' &&
          (account as GroupAccount).members?.length ? (
            <p className="text-xs text-slate-400 mt-1.5">
              참여: {(account as GroupAccount).members.map((m) => m.name).join(', ')}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <EditIcon width={18} height={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          >
            <TrashIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
