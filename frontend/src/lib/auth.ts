'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, AuthState, Role, User } from './types';
import { parseJwt } from './jwt';

const STORAGE_KEY = 'donnation_access_token';

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (auth: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const decoded = token ? parseJwt<{ sub: string; email: string; role: Role }>(token) : null;

    if (token && decoded) {
      setAccessToken(token);
      setUser({
        id: decoded.sub,
        email: decoded.email || '',
        role: decoded.role,
        displayName: null,
        walletAddress: null,
        createdAt: new Date().toISOString(),
      });
    }

    setLoading(false);
  }, []);

  const login = (auth: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, auth.accessToken);
    setAccessToken(auth.accessToken);
    setUser(auth.user);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(accessToken && user),
      login,
      logout,
    }),
    [accessToken, loading, user],
  );
  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(STORAGE_KEY);
}

export function clearAuth() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function getRoleRedirect(role: Role | null): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'ASSOCIATION':
      return '/association';
    default:
      return '/donations';
  }
}
