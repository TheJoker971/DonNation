'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authenticate } from '@/lib/api';
import { useAuth, getRoleRedirect } from '@/lib/auth';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import type { AuthResponse, LoginRequest } from '@/lib/types';

export default function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAssociationMode = searchParams.get('role') === 'association';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finishLogin = (auth: AuthResponse) => {
    login(auth);
    router.push(getRoleRedirect(auth.user.role));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const auth = await authenticate('/auth/login', { email, password } as LoginRequest);
      finishLogin(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">
        {isAssociationMode ? 'Connexion association' : 'Connexion'}
      </h1>
      <p className="mt-2 text-slate-600">
        {isAssociationMode
          ? 'Connectez-vous avec votre email et mot de passe.'
          : 'Connectez votre wallet ou utilisez email + mot de passe.'}
      </p>

      {!isAssociationMode && (
        <div className="mt-8 space-y-4">
          <WalletConnectButton
            loginMode
            disabled={submitting}
            onAuthenticated={finishLogin}
            onError={setError}
          />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide text-slate-500">
              <span className="bg-white px-3">ou email</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">Mot de passe</label>
            {isAssociationMode && (
              <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Mot de passe oublié ?
              </Link>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-8 space-y-2 border-t border-slate-200 pt-6 text-sm text-slate-600">
        {isAssociationMode ? (
          <p>
            Pas encore de compte ?{' '}
            <Link href="/register/association" className="font-semibold text-brand-600 hover:text-brand-700">
              Inscrire mon association
            </Link>
          </p>
        ) : (
          <>
            <p>
              Pas encore de compte ?{' '}
              <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Inscription donateur
              </Link>
            </p>
            <p>
              Vous représentez une association ?{' '}
              <Link href="/login?role=association" className="font-semibold text-brand-600 hover:text-brand-700">
                Connexion association
              </Link>
            </p>
          </>
        )}
        {isAssociationMode && (
          <p>
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Connexion donateur
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
