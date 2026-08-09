import type {
  BenchmarkRequest,
  BenchmarkResponse,
  BenchmarkResult,
  BenchmarkSuccess,
} from './benchmark.types'

function runWorker(count: number): Promise<BenchmarkSuccess> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./address.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<BenchmarkResponse>) => {
      worker.terminate()

      if (event.data.type === 'error') {
        reject(new Error(event.data.message))
        return
      }

      resolve(event.data)
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Worker 加载失败'))
    }

    const request: BenchmarkRequest = { type: 'benchmark', count }
    worker.postMessage(request)
  })
}

export async function benchmarkAddresses(
  count: number,
  requestedWorkerCount = navigator.hardwareConcurrency || 1,
): Promise<BenchmarkResult> {
  const workerCount = Math.max(1, Math.min(requestedWorkerCount, count))
  const baseCount = Math.floor(count / workerCount)
  const remainder = count % workerCount
  const startedAt = performance.now()
  const jobs = Array.from({ length: workerCount }, (_, index) =>
    runWorker(baseCount + (index < remainder ? 1 : 0)),
  )
  const results = await Promise.all(jobs)
  const elapsedMs = performance.now() - startedAt
  const sample = results[0]

  return {
    count,
    workerCount,
    elapsedMs,
    computeMs: Math.max(...results.map((result) => result.computeMs)),
    addressesPerSecond: count / (elapsedMs / 1000),
    samplePrivateKey: sample.privateKey,
    sampleAddress: sample.address,
  }
}
