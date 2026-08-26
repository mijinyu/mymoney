import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/database'
import {
  CoinIcon,
  PiggyIcon,
  GridIcon,
  ArrowRight,
} from '../components/icons'

const TABLES = ['accounts', 'transactions', 'allowances', 'goals', 'categories'] as const

export default function More() {
  const fileRef = useRef<HTMLInputElement>(null)

  async function exportData() {
    const data: Record<string, unknown> = { _app: 'mymoney', _version: 1, _exportedAt: new Date().toISOString() }
    for (const t of TABLES) {
      data[t] = await (db as any)[t].toArray()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `가계부백업_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data._app !== 'mymoney') {
        alert('이 앱의 백업 파일이 아니에요.')
        return
      }
      if (
        !confirm(
          '불러오면 현재 기기의 데이터가 백업 파일 내용으로 교체됩니다. 계속할까요?'
        )
      )
        return
      await db.transaction('rw', db.accounts, db.transactions, db.allowances, db.goals, db.categories, async () => {
        for (const t of TABLES) {
          await (db as any)[t].clear()
          if (Array.isArray(data[t])) await (db as any)[t].bulkAdd(data[t])
        }
      })
      alert('불러오기 완료! 데이터가 복원되었어요.')
    } catch (e) {
      alert('파일을 읽는 중 문제가 생겼어요.')
      console.error(e)
    }
  }

  const menu = [
    { to: '/allowance', label: '용돈 관리', desc: '월 용돈 예산·남은 금액', Icon: CoinIcon, color: 'bg-amber-100 text-amber-600' },
    { to: '/goals', label: '저축 목표', desc: '돈 모으기 목표 관리', Icon: PiggyIcon, color: 'bg-brand/10 text-brand' },
    { to: '/categories', label: '카테고리 관리', desc: '지출·수입 분류 편집', Icon: GridIcon, color: 'bg-indigo-100 text-indigo-600' },
  ]

  return (
    <div className="pt-safe">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">더보기</h1>
      </header>

      <section className="px-5 space-y-2">
        {menu.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="card p-4 flex items-center gap-3 active:bg-slate-50"
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
              <m.Icon width={22} height={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{m.label}</p>
              <p className="text-xs text-slate-400">{m.desc}</p>
            </div>
            <ArrowRight className="text-slate-300" width={20} height={20} />
          </Link>
        ))}
      </section>

      {/* 데이터 백업 */}
      <section className="px-5 mt-6">
        <h2 className="font-bold text-slate-700 mb-2 text-sm">데이터 백업</h2>
        <div className="card p-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            지금은 데이터가 이 기기(브라우저)에만 저장돼요. 다른 기기로 옮기거나
            안전하게 보관하려면 백업 파일로 내보낸 뒤, 새 기기에서 불러오세요.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={exportData}>
              내보내기
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              불러오기
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>

      <section className="px-5 mt-6">
        <div className="card p-4 text-center">
          <p className="text-sm font-semibold">나만의 가계부</p>
          <p className="text-xs text-slate-400 mt-0.5">
            카드·은행·현금·모임통장을 한 곳에서 · v0.1
          </p>
        </div>
      </section>
    </div>
  )
}
