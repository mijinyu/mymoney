// OCR로 뽑은 텍스트에서 거래 정보를 추정한다.
// 완벽하지 않으므로, 결과는 항상 사용자가 확인·수정하는 것을 전제로 한다.

import { todayStr } from './format'

export interface ParsedReceipt {
  amount?: number
  date?: string
  merchant?: string
  type: 'expense' | 'income'
  cardHint?: string // 감지된 카드사/은행 키워드
  raw: string
}

// 금액 후보 주변에 이런 단어가 있으면 '결제금액이 아님'으로 낮게 봄
const NON_AMOUNT_HINTS = ['잔액', '한도', '누적', '적립', '이용가능', '가용', '포인트', '할부금']
// 결제/승인 관련이면 높게 봄
const PAY_HINTS = ['승인', '결제', '출금', '사용', '금액', '지불', '구매']
const INCOME_HINTS = ['입금', '급여', '월급', '이체입금', '환급', '지급']

// 카드사 / 은행 키워드
const ISSUERS = [
  '국민', 'KB', '신한', '삼성', '현대', '롯데', '우리', '하나', '농협', 'NH',
  '카카오', '토스', 'BC', '비씨', '씨티', '기업', 'IBK', '수협', '새마을', 'SC',
]

function normalizeNumber(s: string): number {
  return parseInt(s.replace(/[^0-9]/g, ''), 10)
}

// 텍스트에서 "12,345원" / "12345 원" 형태의 금액 후보를 위치·주변문맥과 함께 찾음
function findAmountCandidates(text: string) {
  const re = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\s*원/g
  const out: { value: number; index: number; context: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const value = normalizeNumber(m[1])
    if (!value || value < 100) continue
    const start = Math.max(0, m.index - 12)
    const end = Math.min(text.length, m.index + m[0].length + 8)
    out.push({ value, index: m.index, context: text.slice(start, end) })
  }
  return out
}

function pickAmount(text: string): number | undefined {
  const cands = findAmountCandidates(text)
  if (cands.length === 0) return undefined

  const scored = cands.map((c) => {
    let score = 0
    if (NON_AMOUNT_HINTS.some((h) => c.context.includes(h))) score -= 5
    if (PAY_HINTS.some((h) => c.context.includes(h))) score += 3
    // 보통 결제금액은 화면 위쪽(앞쪽)에 등장
    score += (1 - c.index / Math.max(1, text.length)) * 2
    return { ...c, score }
  })

  scored.sort((a, b) => b.score - a.score)
  // 잔액류로 강하게 감점된 것만 남았다면 그중 최상위라도 반환
  return scored[0].value
}

// 다양한 한국식 날짜 표기 → YYYY-MM-DD
function pickDate(text: string): string | undefined {
  const now = new Date()
  const y = now.getFullYear()

  // 2026.08.26 / 2026-08-26 / 2026/08/26
  let m = text.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (m) return fmt(+m[1], +m[2], +m[3])

  // 8월 26일
  m = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (m) return fmt(y, +m[1], +m[2])

  // 08/26 또는 08-26 (연도 없음)
  m = text.match(/(?<!\d)(\d{1,2})[./\-](\d{1,2})(?!\d)/)
  if (m) {
    const a = +m[1]
    const b = +m[2]
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return fmt(y, a, b)
  }
  return undefined

  function fmt(yy: number, mm: number, dd: number) {
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined
    return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  }
}

// 가맹점(상호) 추정: 한글이 많은 줄 중 키워드/금액/날짜가 아닌 것
function pickMerchant(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const bad = [...NON_AMOUNT_HINTS, ...PAY_HINTS, ...INCOME_HINTS, '승인', '취소', '알림', '카드', '은행', '체크', '신용']
  const candidates = lines.filter((l) => {
    if (/[0-9]{3,}\s*원/.test(l)) return false // 금액 줄 제외
    if (/\d{1,2}[:.]\d{2}/.test(l)) return false // 시간 줄 제외
    if (/[[\](){}]/.test(l)) return false // [Web발신], (광고) 등 헤더 제외
    if (/발신|광고|무료거부|고객센터/.test(l)) return false
    if (/님\s*$/.test(l)) return false // "홍길동님" 수신자 이름 제외
    if (ISSUERS.some((k) => l.replace(/\s/g, '') === k || l.startsWith(k) && l.length <= k.length + 3)) return false
    const hangulOrEng = (l.match(/[가-힣A-Za-z]/g) || []).length
    if (hangulOrEng < 2) return false
    return true
  })

  // 키워드가 적게 섞인, 적당한 길이의 줄을 우선
  candidates.sort((a, b) => {
    const score = (s: string) =>
      (bad.filter((k) => s.includes(k)).length) * 3 + Math.abs(s.length - 8) * 0.2
    return score(a) - score(b)
  })
  return candidates[0]?.replace(/\s{2,}/g, ' ').slice(0, 30)
}

function detectIssuer(text: string): string | undefined {
  for (const k of ISSUERS) {
    if (text.includes(k)) return k
  }
  return undefined
}

export function parseReceipt(text: string): ParsedReceipt {
  const clean = text.replace(/[ \t]+/g, ' ')
  const isIncome = INCOME_HINTS.some((h) => clean.includes(h)) &&
    !PAY_HINTS.some((h) => clean.includes(h))

  return {
    amount: pickAmount(clean),
    date: pickDate(clean) ?? todayStr(),
    merchant: pickMerchant(text),
    type: isIncome ? 'income' : 'expense',
    cardHint: detectIssuer(clean),
    raw: text.trim(),
  }
}
