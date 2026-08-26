import { createContext, useContext, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HomeIcon, ListIcon, GridIcon, PlusIcon, PiggyIcon } from './icons'
import { TransactionSheet } from './TransactionSheet'
import type { Transaction } from '../db/types'

// 어디서나 거래입력 시트를 열 수 있게 하는 컨텍스트
const AddTxContext = createContext<(tx?: Transaction) => void>(() => {})
export const useAddTx = () => useContext(AddTxContext)

const tabs = [
  { to: '/', label: '홈', Icon: HomeIcon, end: true },
  { to: '/history', label: '내역', Icon: ListIcon, end: false },
  { to: '/accounts', label: '자산', Icon: GridIcon, end: false },
  { to: '/more', label: '더보기', Icon: PiggyIcon, end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>()
  const location = useLocation()

  const openSheet = (tx?: Transaction) => {
    setEditing(tx)
    setSheetOpen(true)
  }

  return (
    <AddTxContext.Provider value={openSheet}>
      <div className="mx-auto max-w-md min-h-full bg-slate-50 relative">
        <main className="pb-28">{children}</main>

        {/* 하단 네비 + 가운데 입력 버튼 */}
        <nav className="fixed bottom-0 inset-x-0 z-30">
          <div className="mx-auto max-w-md relative">
            <div className="bg-white/95 backdrop-blur border-t border-slate-100 grid grid-cols-5 items-center pb-safe">
              {tabs.slice(0, 2).map((t) => (
                <TabItem key={t.to} {...t} />
              ))}
              <div />
              {tabs.slice(2).map((t) => (
                <TabItem key={t.to} {...t} />
              ))}
            </div>
            {/* 가운데 FAB */}
            <button
              onClick={() => openSheet()}
              className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-brand/30 flex items-center justify-center active:scale-90 transition"
              aria-label="거래 입력"
            >
              <PlusIcon width={28} height={28} />
            </button>
          </div>
        </nav>

        <TransactionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          editing={editing}
          key={location.key + String(sheetOpen)}
        />
      </div>
    </AddTxContext.Provider>
  )
}

function TabItem({
  to,
  label,
  Icon,
  end,
}: {
  to: string
  label: string
  Icon: (p: any) => JSX.Element
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
          isActive ? 'text-brand' : 'text-slate-400'
        }`
      }
    >
      <Icon width={22} height={22} />
      {label}
    </NavLink>
  )
}
