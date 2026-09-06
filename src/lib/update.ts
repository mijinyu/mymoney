// 최신 버전으로 강제 새로고침.
// PWA(홈 화면 앱)에서 서비스워커가 옛 버전을 캐시하고 있을 때,
// 캐시를 비우고 서비스워커를 갱신한 뒤 새로 받아온다.
export async function forceUpdate() {
  // 1) 서비스워커 '등록 해제' — 옛 버전을 붙들고 있는 워커를 제거해야
  //    다음 로드에서 네트워크에서 새 파일을 받아온다. (IndexedDB 데이터는 그대로)
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
    }
  } catch {
    /* ignore */
  }
  // 2) 캐시 스토리지 비우기 (사진/JS 등 정적 캐시만; 가계부 데이터와 무관)
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  // 3) 쿼리스트링을 바꿔 HTTP 캐시까지 우회해 새로 로드
  const url = new URL(window.location.href)
  url.searchParams.set('_r', String(Date.now()))
  window.location.replace(url.toString())
}

export const BUILD_TIME =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''
