// 통화/날짜 포맷 유틸

export function won(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`
}

/** 부호를 색과 함께 쓰기 좋게 +/- 붙임 */
export function wonSigned(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** YYYY-MM */
export function monthStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function currentMonth(): string {
  return monthStr(new Date())
}

export function addMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthStr(d)
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y}년 ${m}월`
}

export function dateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  const dow = ['일', '월', '화', '수', '목', '금', '토']
  const dt = new Date(dateStr + 'T00:00:00')
  return `${m}.${d} (${dow[dt.getDay()]})`
}

export function daysUntil(day: number): number {
  // 이번 달 또는 다음 달의 특정 '일'까지 남은 일수
  const now = new Date()
  const today = now.getDate()
  let target = new Date(now.getFullYear(), now.getMonth(), day)
  if (day < today) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, day)
  }
  const diff = Math.ceil(
    (target.getTime() - new Date(now.getFullYear(), now.getMonth(), today).getTime()) /
      86400000
  )
  return diff
}
