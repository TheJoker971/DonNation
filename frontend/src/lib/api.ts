import type { AuthResponse } from './types';
import { getAccessToken, clearAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL must be defined in .env.local');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    throw new Error('Unauthorized');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export async function authenticate(path: string, body: unknown): Promise<AuthResponse> {
  return api<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
