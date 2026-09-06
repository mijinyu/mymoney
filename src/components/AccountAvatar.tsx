import type { Account } from '../db/types'
import { issuerBrand } from '../lib/brands'
import { CardIcon, BankIcon, CashIcon, GroupIcon } from './icons'

// 계좌 앞에 붙는 아이콘: 은행/카드사가 감지되면 브랜드 배지, 아니면 종류 아이콘
export function AccountAvatar({
  account,
  size = 40,
}: {
  account: Account
  size?: number
}) {
  const brand =
    account.type === 'card' || account.type === 'bank'
      ? issuerBrand(account.name)
      : null

  if (brand) {
    // 라벨 길이에 따라 글자 크기 조절
    const fontSize = brand.label.length >= 4 ? size * 0.24 : brand.label.length >= 2 ? size * 0.3 : size * 0.42
    return (
      <span
        className="rounded-xl flex items-center justify-center font-extrabold shrink-0 tracking-tight"
        style={{
          width: size,
          height: size,
          background: brand.color,
          color: brand.fg,
          fontSize,
        }}
      >
        {brand.label}
      </span>
    )
  }

  const icon = size * 0.5
  const Icon =
    account.type === 'card'
      ? CardIcon
      : account.type === 'bank'
        ? BankIcon
        : account.type === 'cash'
          ? CashIcon
          : GroupIcon
  return (
    <span
      className="rounded-xl flex items-center justify-center text-white shrink-0"
      style={{ width: size, height: size, background: account.color }}
    >
      <Icon width={icon} height={icon} />
    </span>
  )
}
