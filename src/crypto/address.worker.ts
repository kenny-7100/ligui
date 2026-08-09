/// <reference lib="webworker" />

import {
  keccak256,
  secp256k1Expand,
  secp256k1FromSeed,
  waitReady,
} from '@polkadot/wasm-crypto'
import type {
  BenchmarkRequest,
  BenchmarkResponse,
} from './benchmark.types'

const worker = self as DedicatedWorkerGlobalScope

function bytesToHex(bytes: Uint8Array): string {
  let result = ''

  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, '0')
  }

  return result
}

function createAddress(privateKey: Uint8Array): string {
  const keyPair = secp256k1FromSeed(privateKey)
  const compressedPublicKey = keyPair.subarray(32)
  const publicKey = secp256k1Expand(compressedPublicKey)
  const hash = keccak256(publicKey.subarray(1))

  return `0x${bytesToHex(hash.subarray(12))}`
}

worker.onmessage = async (event: MessageEvent<BenchmarkRequest>) => {
  if (event.data.type !== 'benchmark') return

  try {
    const ready = await waitReady()

    if (!ready) {
      throw new Error('WASM 初始化失败')
    }

    const privateKey = new Uint8Array(32)
    let address = ''
    const startedAt = performance.now()

    for (let index = 0; index < event.data.count; index += 1) {
      crypto.getRandomValues(privateKey)
      address = createAddress(privateKey)
    }

    const response: BenchmarkResponse = {
      type: 'result',
      count: event.data.count,
      computeMs: performance.now() - startedAt,
      privateKey: `0x${bytesToHex(privateKey)}`,
      address,
    }
    worker.postMessage(response)
  } catch (error) {
    const response: BenchmarkResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker 计算失败',
    }
    worker.postMessage(response)
  }
}

export {}
