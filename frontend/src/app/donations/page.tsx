'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Donation, DonorStats } from '@/lib/types';
import { formatEurDetailed } from '@/lib/format';
import { getNextLevelHint } from '@/lib/donor-level';
import { AuthGuard } from '@/components/AuthGuard';
import { DonorLevelBadge } from '@/components/DonorLevelBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DonationStatusBadge } from '@/components/DonationStatusBadge';

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Donation[]>('/donations/me'), api<DonorStats>('/donations/me/stats')])
      .then(([donationsData, statsData]) => {
        setDonations(donationsData);
        setStats(statsData);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les dons'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Mes dons</h1>
          <p className="mt-2 text-slate-600">
            Votre historique, vos points de fidélité et vos reçus certifiés.
          </p>
        </div>

        {stats && (
          <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
                  Votre engagement
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <DonorLevelBadge level={stats.level} />
                  {getNextLevelHint(stats.level, stats.totalPoints) && (
                    <span className="text-sm text-slate-600">
                      {getNextLevelHint(stats.level, stats.totalPoints)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total donné', value: formatEurDetailed(stats.totalDonatedEur) },
                { label: 'Points', value: String(stats.totalPoints) },
                { label: 'Dons', value: String(stats.donationCount) },
                { label: 'Associations', value: String(stats.associationsSupported) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
        ) : donations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">
            Aucun don pour le moment.{' '}
            <Link href="/associations" className="font-semibold text-brand-600 hover:text-brand-700">
              Parcourir les associations
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {donations.map((donation) => (
              <article
                key={donation.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {donation.association?.name || 'Association'}
                    </h2>
                    <p className="text-2xl font-bold text-brand-700">
                      {formatEurDetailed(donation.amountEur)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(donation.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' · '}
                      +{donation.pointsEarned} pts
                    </p>
                  </div>
                  <DonationStatusBadge status={donation.status} />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/donations/${donation.id}`}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Voir le détail
                  </Link>
                  {donation.association?.slug && (
                    <Link
                      href={`/associations/${donation.association.slug}`}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Voir l&apos;association
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
