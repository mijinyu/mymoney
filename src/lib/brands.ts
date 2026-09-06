// 은행/카드사 이름에서 브랜드를 추정해 상징색+짧은 라벨을 돌려준다.
// (공식 로고 대신, 브랜드 색과 이니셜로 만든 배지 — 상표 문제 없이 한눈에 구분)
export interface Brand {
  color: string
  label: string
  fg: string // 글자색
}

const BRANDS: { match: string[]; brand: Brand }[] = [
  { match: ['국민', 'kb', '케이비'], brand: { color: '#FFBC00', label: 'KB', fg: '#111' } },
  { match: ['카카오', 'kakao'], brand: { color: '#FFE300', label: 'k', fg: '#111' } },
  { match: ['토스', 'toss'], brand: { color: '#0064FF', label: 'toss', fg: '#fff' } },
  { match: ['신한'], brand: { color: '#0046FF', label: '신한', fg: '#fff' } },
  { match: ['삼성'], brand: { color: '#1428A0', label: '삼성', fg: '#fff' } },
  { match: ['현대'], brand: { color: '#111111', label: '현대', fg: '#fff' } },
  { match: ['롯데'], brand: { color: '#DA291C', label: '롯데', fg: '#fff' } },
  { match: ['우리'], brand: { color: '#0067AC', label: '우리', fg: '#fff' } },
  { match: ['하나', 'keb'], brand: { color: '#008485', label: '하나', fg: '#fff' } },
  { match: ['농협', 'nh'], brand: { color: '#0AA14B', label: 'NH', fg: '#fff' } },
  { match: ['기업', 'ibk'], brand: { color: '#00457C', label: 'IBK', fg: '#fff' } },
  { match: ['씨티', '시티', 'citi'], brand: { color: '#003B7E', label: 'citi', fg: '#fff' } },
  { match: ['비씨', 'bc카드'], brand: { color: '#EF2E24', label: 'BC', fg: '#fff' } },
  { match: ['제일', 'sc'], brand: { color: '#0F7C3A', label: 'SC', fg: '#fff' } },
  { match: ['새마을', 'mg'], brand: { color: '#00A651', label: 'MG', fg: '#fff' } },
  { match: ['수협'], brand: { color: '#0083CA', label: '수협', fg: '#fff' } },
  { match: ['케이뱅크', '케뱅', 'kbank'], brand: { color: '#3C4BFF', label: 'k뱅', fg: '#fff' } },
  { match: ['우체국'], brand: { color: '#E4002B', label: '우체국', fg: '#fff' } },
]

export function issuerBrand(name: string): Brand | null {
  const n = name.toLowerCase().replace(/\s/g, '')
  for (const { match, brand } of BRANDS) {
    if (match.some((m) => n.includes(m.toLowerCase()))) return brand
  }
  return null
}
