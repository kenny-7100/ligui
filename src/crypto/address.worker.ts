/// <reference lib="webworker" />

import initWasm, { generate_batch } from '../wasm-address/pkg/address_benchmark_wasm.js'
import type { BenchmarkRequest, WorkerResponse } from './benchmark.types'

const worker = self as DedicatedWorkerGlobalScope
const TIMED_BATCH_SIZE = 16_384
const RESULT_PRIVATE_KEY_OFFSET = 0
const RESULT_ADDRESS_OFFSET = 32
const RESULT_NEXT_KEY_OFFSET = 52

let nextPrivateKey = crypto.getRandomValues(new Uint8Array(32))

function bytesToHex(bytes: Uint8Array): string {
  let result = ''

  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, '0')
  }

  return result
}

function runBatch(count: number) {
  const result = generate_batch(nextPrivateKey, count)
  nextPrivateKey = result.slice(RESULT_NEXT_KEY_OFFSET)

  return result
}

async function initialize() {
  try {
    await initWasm()
    const response: WorkerResponse = { type: 'ready' }
    worker.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'WASM 初始化失败',
    }
    worker.postMessage(response)
  }
}

worker.onmessage = (event: MessageEvent<BenchmarkRequest>) => {
  if (event.data.type !== 'benchmark') return

  try {
    const startedAt = performance.now()
    let count = 0
    let result: Uint8Array

    if (event.data.durationMs !== undefined) {
      const deadline = startedAt + event.data.durationMs
      result = runBatch(TIMED_BATCH_SIZE)
      count += TIMED_BATCH_SIZE

      while (performance.now() < deadline) {
        result = runBatch(TIMED_BATCH_SIZE)
        count += TIMED_BATCH_SIZE
      }
    } else {
      count = event.data.count ?? 0
      result = runBatch(count)
    }

    const response: WorkerResponse = {
      type: 'result',
      count,
      computeMs: performance.now() - startedAt,
      privateKey: `0x${bytesToHex(result.slice(RESULT_PRIVATE_KEY_OFFSET, RESULT_ADDRESS_OFFSET))}`,
      address: `0x${bytesToHex(result.slice(RESULT_ADDRESS_OFFSET, RESULT_NEXT_KEY_OFFSET))}`,
    }
    worker.postMessage(response)
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker 计算失败',
    }
    worker.postMessage(response)
  }
}

void initialize()

export {}
