'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => setAssociations(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les associations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Associations approuvées</h1>
        <p className="mt-2 text-slate-600">Choisissez une association et contribuez avec un don en ligne.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {associations.map((association) => (
          <div key={association.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{association.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{association.description || 'Pas de description fournie.'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${association.stripeOnboardingComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {association.stripeOnboardingComplete ? 'Prête pour les dons' : 'Stripe non prêt'}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/associations/${association.slug}/donate`}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${association.stripeOnboardingComplete ? 'bg-slate-900 text-white hover:bg-slate-700' : 'cursor-not-allowed bg-slate-200 text-slate-500'}`}
                aria-disabled={!association.stripeOnboardingComplete}
              >
                Faire un don
              </Link>
              {!association.stripeOnboardingComplete && (
                <p className="text-sm text-slate-500">Cette association n’est pas encore prête à recevoir des dons.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
