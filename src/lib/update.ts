// 최신 버전으로 강제 새로고침.
// PWA(홈 화면 앱)에서 서비스워커가 옛 버전을 캐시하고 있을 때,
// 캐시를 비우고 서비스워커를 갱신한 뒤 새로 받아온다.
export async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update().catch(() => {})))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // 캐시 접근이 막혀 있어도 아래 reload는 시도
  }
  // 캐시 무력화를 위해 쿼리스트링을 바꿔 새로 로드
  const url = new URL(window.location.href)
  url.searchParams.set('_r', String(Date.now()))
  window.location.replace(url.toString())
}

export const BUILD_TIME =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
