import { useEffect, useState, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { won } from '../lib/format'

// 배경 스크롤 잠금 (여러 시트가 겹쳐도 안전하게 참조 카운트)
let lockCount = 0
let savedScrollY = 0
function lockBody() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    const b = document.body
    b.style.position = 'fixed'
    b.style.top = `-${savedScrollY}px`
    b.style.left = '0'
    b.style.right = '0'
    b.style.width = '100%'
  }
  lockCount++
}
function unlockBody() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    const b = document.body
    b.style.position = ''
    b.style.top = ''
    b.style.left = ''
    b.style.right = ''
    b.style.width = ''
    window.scrollTo(0, savedScrollY)
  }
}

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
  // 보이는 영역 높이 & 키보드 높이 추적 (iOS 키보드 대응)
  const [vp, setVp] = useState<{ h: number; kb: number }>({
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
    kb: 0,
  })

  useEffect(() => {
    if (!open) return
    lockBody()
    const vv = window.visualViewport
    const update = () => {
      const h = vv ? vv.height : window.innerHeight
      const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
      setVp({ h, kb })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      unlockBody()
    }
  }, [open])

  if (!open) return null

  const maxH = vp.kb > 0 ? vp.h - 8 : Math.round(vp.h * 0.92)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ paddingBottom: vp.kb }}
    >
      <div
        className="absolute inset-0 bg-black/40 animate-[fade_.15s_ease]"
        style={{ touchAction: 'none' }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl flex flex-col animate-[slideup_.2s_ease]"
        style={{ maxHeight: maxH }}
      >
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
        <div
          className="px-5 pb-8 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
          {/* 키보드가 없을 때 하단 여백(안전영역) */}
          {vp.kb === 0 && <div className="pb-safe" />}
        </div>
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
