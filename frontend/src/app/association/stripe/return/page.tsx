'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StripeReturnPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const refreshData = async () => {
      try {
        const data = await api<Association>('/associations/me');
        setAssociation(data);
        setComplete(Boolean(data.stripeOnboardingComplete));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de vérifier le statut Stripe');
      } finally {
        setLoading(false);
      }
    };

    refreshData();
    interval = setInterval(refreshData, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Retour Stripe</h1>
            <p className="mt-2 text-slate-600">Stripe a renvoyé vers le front. Votre compte est en cours de vérification.</p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="space-y-5">
                <p className="text-sm text-slate-700">Statut de l’association :</p>
                <p className="text-lg font-semibold text-slate-900">{association?.name || '—'}</p>
                <p className="text-sm text-slate-600">
                  {complete
                    ? 'Stripe est connecté et prêt à recevoir des dons.'
                    : 'Stripe n’est pas encore validé. Veuillez patienter ou vérifier votre compte Stripe.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/association" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
                    Retour au dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>}
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
