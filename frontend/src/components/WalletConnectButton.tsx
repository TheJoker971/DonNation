'use client';

import { useCallback, useRef, useState } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react';
import { BrowserProvider } from 'ethers';
import { loginWithWallet } from '@/lib/wallet-auth';
import type { AuthResponse } from '@/lib/types';
import type { Eip1193Provider } from 'ethers';

type Props = {
  loginMode?: boolean;
  onAuthenticated?: (auth: AuthResponse) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
};

export function WalletConnectButton({
  loginMode = false,
  onAuthenticated,
  onError,
  disabled = false,
  className = '',
}: Props) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155');
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);
  // Tracks if the connection was initiated by the user clicking the button
  const userClickedConnect = useRef(false);

  const runLogin = useCallback(async () => {
    if (!address || !walletProvider) return;
    setLoading(true);
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const auth = await loginWithWallet(address, (msg) => signer.signMessage(msg));
      onAuthenticated?.(auth);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Erreur de connexion wallet');
    } finally {
      setLoading(false);
      userClickedConnect.current = false;
    }
  }, [address, walletProvider, onAuthenticated, onError]);

  const handleConnect = () => {
    if (loginMode && isConnected && address && walletProvider) {
      // Wallet already connected (e.g. MetaMask auto-reconnected) — user clicks to authenticate
      userClickedConnect.current = true;
      void runLogin();
      return;
    }
    // Open the AppKit modal to choose a wallet
    userClickedConnect.current = true;
    open();
  };

  const handleDisconnect = async () => {
    userClickedConnect.current = false;
    try {
      await disconnect();
    } catch {
      // ignore
    }
    // Clear AppKit cached session from localStorage so MetaMask doesn't auto-reconnect
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('wc@') ||
          key.startsWith('@w3m') ||
          key.startsWith('W3M') ||
          key.startsWith('wagmi') ||
          key === 'WALLETCONNECT_DEEPLINK_CHOICE'
        ) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  const defaultLoginClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

  // === Mode connexion (sur la page login) ===
  if (loginMode) {
    // Wallet auto-connecté (MetaMask se souvient) — proposer à l'utilisateur de continuer ou déconnecter
    if (isConnected && address && !loading) {
      return (
        <div className="space-y-2">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm text-slate-700">
              Wallet détecté :{' '}
              <span className="font-mono font-semibold text-brand-700">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={disabled || loading}
            className={className || defaultLoginClass}
          >
            {loading ? 'Signature en cours...' : 'Se connecter avec ce wallet'}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="inline-flex w-full justify-center rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Utiliser un autre compte
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={disabled || loading}
        className={className || defaultLoginClass}
      >
        {loading ? 'Signature en cours...' : 'Continuer avec WalletConnect'}
      </button>
    );
  }

  // === Mode widget (hors page login) ===
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-r from-brand-100 to-brand-50 px-4 py-2">
          <p className="text-sm font-semibold text-brand-700">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <button type="button" onClick={handleDisconnect} className="btn-secondary text-sm">
          Déconnecter
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={disabled || loading}
      className={className || 'btn-primary disabled:cursor-not-allowed disabled:opacity-50'}
    >
      {loading ? 'Connexion...' : 'Connecter le wallet'}
    </button>
  );
}
