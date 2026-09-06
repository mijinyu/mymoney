import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

// 간단한 key-value 설정 (settings 테이블 사용)
export function setSetting(key: string, value: string) {
  return db.settings.put({ key, value })
}

/** boolean 설정을 읽는 훅. 값이 없으면 defaultVal */
export function useBoolSetting(key: string, defaultVal: boolean): boolean {
  const row = useLiveQuery(() => db.settings.get(key), [key])
  if (row === undefined) return defaultVal // 로딩 중이거나 미설정 → 기본값
  return row.value === 'true'
}

export const ALLOWANCE_ENABLED = 'useAllowance'
