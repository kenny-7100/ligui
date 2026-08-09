import { useState } from 'react'
import { benchmarkAddresses, benchmarkForDuration } from './crypto/benchmark'
import type { BenchmarkResult } from './crypto/benchmark.types'
import { createEthereumKeyPair, type EthereumKeyPair } from './crypto/ethereum'
import './App.css'

function App() {
  const [keyPair, setKeyPair] = useState<EthereumKeyPair | null>(null)
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null)
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [error, setError] = useState('')

  const generateKeyPair = () => {
    try {
      setKeyPair(createEthereumKeyPair())
      setError('')
    } catch {
      setError('生成失败，请确认浏览器支持安全随机数后重试。')
    }
  }

  const runBenchmark = async () => {
    setIsBenchmarking(true)
    setError('')

    try {
      setBenchmark(await benchmarkAddresses(10_000))
    } catch (benchmarkError) {
      setError(
        benchmarkError instanceof Error
          ? benchmarkError.message
          : '性能测试失败，请重试。',
      )
    } finally {
      setIsBenchmarking(false)
    }
  }

  const runTimedBenchmark = async () => {
    setIsBenchmarking(true)
    setError('')

    try {
      setBenchmark(await benchmarkForDuration(5_000))
    } catch (benchmarkError) {
      setError(
        benchmarkError instanceof Error
          ? benchmarkError.message
          : '性能测试失败，请重试。',
      )
    } finally {
      setIsBenchmarking(false)
    }
  }

  return (
    <main className="workspace">
      <header className="page-header">
        <span className="eyebrow">ETHEREUM</span>
        <h1>密钥与地址测试</h1>
      </header>

      <section className="generator" aria-labelledby="generator-title">
        <h2 id="generator-title">算法输出</h2>

        <div className="field-group">
          <label htmlFor="private-key">私钥</label>
          <div className="input-action">
            <input
              id="private-key"
              type="text"
              value={keyPair?.privateKey ?? ''}
              placeholder="点击右侧按钮生成"
              readOnly
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" onClick={generateKeyPair}>
              随机生成
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="ethereum-address">ETH 地址</label>
          <input
            id="ethereum-address"
            type="text"
            value={keyPair?.address ?? ''}
            placeholder="生成私钥后自动计算"
            readOnly
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="benchmark" aria-labelledby="benchmark-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">WASM + WEB WORKER</span>
            <h2 id="benchmark-title">并行生成基准</h2>
          </div>
          <div className="benchmark-actions">
            <button type="button" onClick={runBenchmark} disabled={isBenchmarking}>
              {isBenchmarking ? '计算中…' : '生成 10,000 个'}
            </button>
            <button type="button" onClick={runTimedBenchmark} disabled={isBenchmarking}>
              持续测试 5 秒
            </button>
          </div>
        </div>

        <dl className="metrics" aria-live="polite">
          <div>
            <dt>端到端耗时</dt>
            <dd>{benchmark ? `${benchmark.elapsedMs.toFixed(1)} ms` : '—'}</dd>
          </div>
          <div>
            <dt>WASM 初始化</dt>
            <dd>{benchmark ? `${benchmark.initializationMs.toFixed(1)} ms` : '—'}</dd>
          </div>
          <div>
            <dt>生成速度</dt>
            <dd>
              {benchmark
                ? `${Math.round(benchmark.addressesPerSecond).toLocaleString()} 地址/秒`
                : '—'}
            </dd>
          </div>
          <div>
            <dt>生成数量 / Worker</dt>
            <dd>
              {benchmark
                ? `${benchmark.count.toLocaleString()} / ${benchmark.workerCount}`
                : '—'}
            </dd>
          </div>
        </dl>

        {benchmark && (
          <div className="sample-output">
            <div className="field-group">
              <label htmlFor="sample-private-key">末次样本私钥</label>
              <input id="sample-private-key" value={benchmark.samplePrivateKey} readOnly />
            </div>
            <div className="field-group">
              <label htmlFor="sample-address">末次样本地址</label>
              <input id="sample-address" value={benchmark.sampleAddress} readOnly />
            </div>
          </div>
        )}
      </section>

      <p className="notice">仅用于算法测试，请勿向测试地址转入资产。</p>
    </main>
  )
}

export default App
