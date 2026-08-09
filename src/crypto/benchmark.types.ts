export type BenchmarkRequest = {
  type: 'benchmark'
  count: number
}

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

export type BenchmarkResult = {
  count: number
  workerCount: number
  elapsedMs: number
  computeMs: number
  addressesPerSecond: number
  samplePrivateKey: string
  sampleAddress: string
}
