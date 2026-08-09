import type {
  BenchmarkRequest,
  BenchmarkResult,
  BenchmarkSuccess,
  WorkerResponse,
} from './benchmark.types'

type PendingWorker = {
  worker: Worker
  run: (request: BenchmarkRequest) => Promise<BenchmarkSuccess>
}

class AddressWorkerPool {
  readonly workerCount: number
  readonly initializationMs: Promise<number>
  private readonly workers: PendingWorker[]

  constructor(workerCount: number) {
    this.workerCount = workerCount
    const startedAt = performance.now()
    const readyPromises: Promise<void>[] = []

    this.workers = Array.from({ length: workerCount }, () => {
      const worker = new Worker(new URL('./address.worker.ts', import.meta.url), {
        type: 'module',
      })
      let resolveReady!: () => void
      let rejectReady!: (error: Error) => void
      let resolveRun: ((result: BenchmarkSuccess) => void) | undefined
      let rejectRun: ((error: Error) => void) | undefined
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve
        rejectReady = reject
      })
      readyPromises.push(ready)

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          resolveReady()
        } else if (event.data.type === 'error') {
          const error = new Error(event.data.message)
          rejectReady(error)
          rejectRun?.(error)
        } else {
          resolveRun?.(event.data)
        }
      }

      worker.onerror = (event) => {
        const error = new Error(event.message || 'Worker 加载失败')
        rejectReady(error)
        rejectRun?.(error)
      }

      return {
        worker,
        run: async (request) => {
          await ready
          return new Promise<BenchmarkSuccess>((resolve, reject) => {
            resolveRun = resolve
            rejectRun = reject
            worker.postMessage(request)
          })
        },
      }
    })

    this.initializationMs = Promise.all(readyPromises).then(
      () => performance.now() - startedAt,
    )
  }

  async benchmarkCount(count: number): Promise<BenchmarkResult> {
    const initializationMs = await this.initializationMs
    const baseCount = Math.floor(count / this.workerCount)
    const remainder = count % this.workerCount
    const startedAt = performance.now()
    const results = await Promise.all(
      this.workers.map((worker, index) =>
        worker.run({
          type: 'benchmark',
          count: baseCount + (index < remainder ? 1 : 0),
        }),
      ),
    )

    return this.createResult(results, performance.now() - startedAt, initializationMs, 'fixed')
  }

  async benchmarkDuration(durationMs: number): Promise<BenchmarkResult> {
    const initializationMs = await this.initializationMs
    const startedAt = performance.now()
    const results = await Promise.all(
      this.workers.map((worker) => worker.run({ type: 'benchmark', durationMs })),
    )

    return this.createResult(results, performance.now() - startedAt, initializationMs, 'timed')
  }

  private createResult(
    results: BenchmarkSuccess[],
    elapsedMs: number,
    initializationMs: number,
    mode: BenchmarkResult['mode'],
  ): BenchmarkResult {
    const count = results.reduce((total, result) => total + result.count, 0)
    const sample = results[0]

    return {
      count,
      workerCount: this.workerCount,
      elapsedMs,
      initializationMs,
      mode,
      addressesPerSecond: count / (elapsedMs / 1000),
      samplePrivateKey: sample.privateKey,
      sampleAddress: sample.address,
    }
  }
}

let pool: AddressWorkerPool | undefined

function getPool() {
  pool ??= new AddressWorkerPool(navigator.hardwareConcurrency || 1)
  return pool
}

export function benchmarkAddresses(count: number) {
  return getPool().benchmarkCount(count)
}

export function benchmarkForDuration(durationMs: number) {
  return getPool().benchmarkDuration(durationMs)
}
