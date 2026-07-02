'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AssociationStatusBadge } from '@/components/AssociationStatusBadge';

export default function AssociationDashboardPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const router = useRouter();

  const fetchAssociation = async () => {
    setLoading(true);
    try {
      const data = await api<Association>('/associations/me');
      setAssociation(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociation();
  }, []);

  const handleStripeOnboard = async () => {
    setOnboarding(true);
    try {
      const response = await api<{ url: string }>('/associations/me/stripe/onboard', { method: 'POST' });
      window.location.href = response.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer Stripe');
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard association</h1>
            <p className="mt-2 text-slate-600">Vos informations et la connexion Stripe.</p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
          ) : !association ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">Aucune association trouvée.</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">{association.name}</h2>
                <p className="mt-2 text-slate-600">{association.description || 'Aucune description fournie.'}</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>Slug : <span className="font-medium text-slate-900">{association.slug}</span></p>
                  <p>Status : <AssociationStatusBadge status={association.status ?? 'PENDING'} /></p>
                  <p>On-chain : <span className="font-medium">{association.onChainRegistered ? 'Oui' : 'Non'}</span></p>
                  <p>Stripe prête : <span className="font-medium">{association.stripeOnboardingComplete ? 'Oui' : 'Non'}</span></p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Actions</h2>
                <div className="mt-6 space-y-4">
                  {!association.stripeOnboardingComplete && (
                    <button
                      type="button"
                      onClick={handleStripeOnboard}
                      disabled={onboarding}
                      className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {onboarding ? 'Redirection Stripe...' : 'Connecter Stripe'}
                    </button>
                  )}
                  {association.status !== 'APPROVED' && (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      En attente de validation admin.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
