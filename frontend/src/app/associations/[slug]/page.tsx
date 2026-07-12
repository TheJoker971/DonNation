'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AssociationProfile } from '@/lib/types';
import { formatEur, formatEurDetailed } from '@/lib/format';
import { AssociationAvatar } from '@/components/AssociationAvatar';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AssociationProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [association, setAssociation] = useState<AssociationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    api<AssociationProfile>(`/associations/${slug}`)
      .then((data) => {
        setAssociation(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Association introuvable');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !association) {
    return (
      <ApiErrorMessage
        title="Association introuvable"
        message={error || 'Cette association n\'existe pas ou n\'est pas encore approuvée.'}
      />
    );
  }

  const canDonate = association.stripeOnboardingComplete;
  const { stats, recentSupporters = [] } = association;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-slate-500">
        <Link href="/associations" className="hover:text-brand-600">
          Associations
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">{association.name}</span>
      </nav>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-10 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-5">
              <div className="rounded-2xl bg-white/10 p-1 ring-2 ring-white/30">
                <AssociationAvatar name={association.name} logoUrl={association.logoUrl} size="lg" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                    Association vérifiée
                  </span>
                  {association.onChainRegistered && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                      Enregistrée on-chain
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-3xl font-bold md:text-4xl">{association.name}</h1>
                {association.approvedAt && (
                  <p className="mt-2 text-sm text-brand-100">
                    Membre DonNation depuis{' '}
                    {new Date(association.approvedAt).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>

            {canDonate && (
              <Link
                href={`/associations/${association.slug}/donate`}
                className="inline-flex justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-brand-50"
              >
                Soutenir cette association
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-100 p-8 sm:grid-cols-3">
          {[
            { label: 'Total collecté', value: formatEur(stats.totalRaisedEur) },
            { label: 'Dons reçus', value: String(stats.donationCount) },
            { label: 'Donateurs', value: String(stats.donorCount) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Notre mission</h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-600">
                {association.description ||
                  'Cette association n\'a pas encore rédigé sa présentation. Votre don contribue directement à ses actions sur le terrain.'}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
              <h3 className="font-semibold text-brand-900">Transparence & confiance</h3>
              <ul className="mt-4 space-y-3 text-sm text-brand-800">
                <li className="flex gap-2">
                  <span aria-hidden>✓</span>
                  Association validée par l&apos;équipe DonNation
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>✓</span>
                  Paiement sécurisé par Stripe Connect
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>✓</span>
                  Reçu certifié on-chain pour chaque donateur
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>✓</span>
                  Traçabilité des dons et reçu PDF téléchargeable
                </li>
              </ul>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-semibold text-slate-900">Derniers soutiens</h3>
              {recentSupporters.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Soyez le premier à soutenir cette association.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recentSupporters.map((supporter, index) => (
                    <li
                      key={`${supporter.createdAt}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-800">{supporter.displayName}</span>
                      <span className="font-semibold text-brand-700">
                        {formatEurDetailed(supporter.amountEur)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canDonate ? (
              <Link
                href={`/associations/${association.slug}/donate`}
                className="btn-primary block w-full text-center"
              >
                Faire un don maintenant
              </Link>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Cette association finalise encore sa configuration Stripe. Revenez bientôt pour
                faire un don.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
