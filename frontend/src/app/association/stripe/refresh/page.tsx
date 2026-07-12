'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StripeRefreshPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await api<{ url: string }>('/associations/me/stripe/onboard', { method: 'POST' });
      window.location.href = response.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de relancer Stripe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Session Stripe expirée</h1>
            <p className="mt-2 text-slate-600">Votre lien Stripe a expiré. Relancez l’onboarding pour continuer.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-5">
              <button
                type="button"
                onClick={handleRetry}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Redirection Stripe...' : 'Relancer l’onboarding'}
              </button>
              <Link href="/association" className="inline-flex w-full justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Retour dashboard
              </Link>
              {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
            </div>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
