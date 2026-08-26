// Tesseract.js 래퍼. 무거운 라이브러리라 필요할 때 동적 import 한다.
import type { ImageLike } from 'tesseract.js'

let workerPromise: Promise<any> | null = null
let progressCb: ((p: number) => void) | null = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker('kor+eng', undefined, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') progressCb?.(m.progress)
        },
      })
    })()
  }
  return workerPromise
}

export async function recognizeImage(
  image: ImageLike,
  onProgress?: (p: number) => void
): Promise<string> {
  progressCb = onProgress ?? null
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(image)
    return data.text || ''
  } finally {
    progressCb = null
  }
}
