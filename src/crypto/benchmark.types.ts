export type BenchmarkRequest = {
  type: 'benchmark'
  count?: number
  durationMs?: number
}

export type WorkerReady = { type: 'ready' }

export type BenchmarkSuccess = {
  type: 'result'
  count: number
  computeMs: number
  privateKey: string
  address: string
}

export type BenchmarkFailure = {
  type: 'error'
  message: string
}

export type BenchmarkResponse = BenchmarkSuccess | BenchmarkFailure
export type WorkerResponse = WorkerReady | BenchmarkResponse

export type BenchmarkResult = {
  count: number
  workerCount: number
  elapsedMs: number
  initializationMs: number
  mode: 'fixed' | 'timed'
  addressesPerSecond: number
  samplePrivateKey: string
  sampleAddress: string
}
