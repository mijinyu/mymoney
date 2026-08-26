import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { won } from '../lib/format'

// 아래에서 올라오는 바텀시트/모달
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 animate-[fade_.15s_ease]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col animate-[slideup_.2s_ease]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="닫기"
          >
            <CloseIcon width={22} height={22} />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto pb-safe">{children}</div>
      </div>
      <style>{`
        @keyframes slideup { from { transform: translateY(30px); opacity:.6 } to { transform: none; opacity:1 } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

// 큰 금액 입력창 (숫자만, 3자리 콤마 표시)
export function MoneyInput({
  value,
  onChange,
  autoFocus,
  placeholder = '0',
}: {
  value: number
  onChange: (n: number) => void
  autoFocus?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        className="input text-right text-2xl font-bold tracking-tight"
        value={value ? value.toLocaleString('ko-KR') : ''}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '')
          onChange(digits ? parseInt(digits, 10) : 0)
        }}
      />
      <span className="text-lg font-semibold text-slate-500">원</span>
    </div>
  )
}

export function Empty({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      {icon && <div className="mb-2 opacity-60">{icon}</div>}
      <p className="text-sm">{text}</p>
    </div>
  )
}

export function StatPill({
  label,
  amount,
  tone = 'default',
}: {
  label: string
  amount: number
  tone?: 'default' | 'income' | 'expense'
}) {
  const color =
    tone === 'income'
      ? 'text-blue-600'
      : tone === 'expense'
        ? 'text-rose-600'
        : 'text-slate-800'
  return (
    <div className="flex-1 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`font-bold ${color}`}>{won(amount)}</p>
    </div>
  )
}

// 진행 막대
export function Progress({
  value,
  max,
  color = '#16a34a',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
