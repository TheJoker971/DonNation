'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, apiUpload } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AssociationStatusBadge } from '@/components/AssociationStatusBadge';
import { AssociationAvatar } from '@/components/AssociationAvatar';
import { AssociationNav } from '@/components/AssociationNav';

export default function AssociationDashboardPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const updated = await apiUpload<Association>('/associations/me/logo', formData);
      setAssociation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard association</h1>
            <p className="mt-2 text-slate-600">Vos informations, votre logo et la connexion Stripe.</p>
            <div className="mt-6">
              <AssociationNav />
            </div>
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
                <div className="flex items-start gap-4">
                  <AssociationAvatar name={association.name} logoUrl={association.logoUrl} size="lg" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{association.name}</h2>
                    <p className="mt-2 text-slate-600">{association.description || 'Aucune description fournie.'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>Slug : <span className="font-medium text-slate-900">{association.slug}</span></p>
                  <p>Status : <AssociationStatusBadge status={association.status ?? 'PENDING'} /></p>
                  <p>On-chain : <span className="font-medium">{association.onChainRegistered ? 'Oui' : 'Non'}</span></p>
                  <p>Stripe prête : <span className="font-medium">{association.stripeOnboardingComplete ? 'Oui' : 'Non'}</span></p>
                  <p className="text-xs text-slate-500">
                    Les dons arrivent en euros sur votre compte Stripe, que le donateur paie par carte ou en crypto.
                  </p>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700">Logo de l&apos;association</label>
                  <p className="mt-1 text-sm text-slate-500">JPG, PNG ou WebP — max 2 Mo. Sans logo, les initiales s&apos;affichent.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  />
                  {uploadingLogo && <p className="mt-2 text-sm text-slate-500">Upload en cours...</p>}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Actions</h2>
                <div className="mt-6 space-y-4">
                  <Link
                    href="/association/donations"
                    className="inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    Voir les dons reçus
                  </Link>

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
