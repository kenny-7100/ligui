import { useState } from 'react'
import { createEthereumKeyPair, type EthereumKeyPair } from './crypto/ethereum'
import './App.css'

function App() {
  const [keyPair, setKeyPair] = useState<EthereumKeyPair | null>(null)
  const [error, setError] = useState('')

  const generateKeyPair = () => {
    try {
      setKeyPair(createEthereumKeyPair())
      setError('')
    } catch {
      setError('生成失败，请确认浏览器支持安全随机数后重试。')
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

      <p className="notice">仅用于算法测试，请勿向测试地址转入资产。</p>
    </main>
  )
}

export default App
