 'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletContextType {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  chainId: number | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Check if MetaMask is already connected on mount
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({
            method: 'eth_accounts',
          })
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0].toLowerCase())
            // Get chain ID
            const chainIdHex = await (window as any).ethereum.request({
              method: 'eth_chainId',
            })
            setChainId(parseInt(chainIdHex, 16))
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error)
        }
      }
    }

    initWallet()

    // Listen for account changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      ;(window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0].toLowerCase())
        } else {
          setAddress(null)
        }
      })

      ;(window as any).ethereum.on('chainChanged', (chainId: string) => {
        setChainId(parseInt(chainId, 16))
      })
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        ;(window as any).ethereum.removeAllListeners('accountsChanged')
        ;(window as any).ethereum.removeAllListeners('chainChanged')
      }
    }
  }, [])

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask or Web3 wallet not detected. Please install it.')
      return
    }

    try {
      setIsConnecting(true)
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      })
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0].toLowerCase())
        // Get chain ID
        const chainIdHex = await (window as any).ethereum.request({
          method: 'eth_chainId',
        })
        setChainId(parseInt(chainIdHex, 16))
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAddress(null)
    setChainId(null)
  }

  // Return JSX element properly
  const value = {
    address,
    isConnected: !!address,
    isConnecting,
    connectWallet,
    disconnectWallet,
    chainId,
  }

  return React.createElement(WalletContext.Provider, { value }, children)
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
