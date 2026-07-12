'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AssociationCard } from '@/components/AssociationCard';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        setAssociations(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les associations');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-gradient">Associations vérifiées</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Découvrez des associations approuvées, consultez leur impact et soutenez celles qui vous
          parlent le plus.
        </p>
        {!error && (
          <p className="mt-4 text-sm text-slate-500">
            {associations.length} association{associations.length > 1 ? 's' : ''} disponible
            {associations.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error ? (
        <ApiErrorMessage message={error} />
      ) : associations.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
          Aucune association approuvée pour le moment.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {associations.map((association, index) => (
            <AssociationCard key={association.id} association={association} animationDelay={index * 80} />
          ))}
        </div>
      )}
    </div>
  );
}
