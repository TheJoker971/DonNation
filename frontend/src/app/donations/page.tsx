'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Donation } from '@/lib/types';
import { formatEurDetailed } from '@/lib/format';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DonationStatusBadge } from '@/components/DonationStatusBadge';

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Donation[]>('/donations/me')
      .then((data) => {
        setDonations(data);
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
          <p className="mt-2 text-slate-600">Votre historique et vos reçus de donation.</p>
        </div>

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
