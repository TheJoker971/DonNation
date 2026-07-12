import { api, authenticate } from './api';
import type { AuthResponse } from './types';

export async function loginWithWallet(
  address: string,
  signMessage: (message: string) => Promise<string>,
): Promise<AuthResponse> {
  const normalized = address.toLowerCase();

  const nonceResponse = await api<{ message: string }>('/auth/wallet/nonce', {
    method: 'POST',
    body: JSON.stringify({ address: normalized }),
  });

  const signature = await signMessage(nonceResponse.message);

  return authenticate('/auth/wallet/verify', { address: normalized, signature });
}
