'use client'

import { useWallet } from '@/lib/wallet'

export function WalletConnectButton() {
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet } =
    useWallet()

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-r from-brand-100 to-brand-50 px-4 py-2">
          <p className="text-sm font-semibold text-brand-700">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <button
          onClick={disconnectWallet}
          className="btn-secondary text-sm"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
