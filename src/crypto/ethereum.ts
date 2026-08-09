import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export type EthereumKeyPair = {
  privateKey: `0x${string}`
  address: `0x${string}`
}

export function createEthereumKeyPair(): EthereumKeyPair {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  return {
    privateKey,
    address: account.address,
  }
}
