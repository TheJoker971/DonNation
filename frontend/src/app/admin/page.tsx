'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AssociationStatusBadge } from '@/components/AssociationStatusBadge';

type AdminFilter = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'ALL';

const FILTERS: { value: AdminFilter; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'SUSPENDED', label: 'Suspendues' },
  { value: 'ALL', label: 'Toutes' },
];

const EMPTY_MESSAGES: Record<AdminFilter, string> = {
  PENDING: 'Aucune association en attente.',
  APPROVED: 'Aucune association approuvée.',
  SUSPENDED: 'Aucune association suspendue.',
  ALL: 'Aucune association enregistrée.',
};

export default function AdminPage() {
  const [filter, setFilter] = useState<AdminFilter>('PENDING');
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchAssociations = useCallback(async () => {
    setLoading(true);
    try {
      const path =
        filter === 'ALL' ? '/admin/associations' : `/admin/associations?status=${filter}`;
      const data = await api<Association[]>(path);
      setAssociations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les associations');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAssociations();
  }, [fetchAssociations]);

  const updateStatus = async (id: string, action: 'approve' | 'suspend') => {
    setActing(true);
    try {
      await api<Association>(`/admin/associations/${id}/${action}`, { method: 'PATCH' });
      await fetchAssociations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setActing(false);
    }
  };

  const canApprove = (status?: Association['status']) =>
    status === 'PENDING' || status === 'SUSPENDED';

  const canSuspend = (status?: Association['status']) =>
    status === 'PENDING' || status === 'APPROVED';

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Gestion des associations</h1>
            <p className="mt-2 text-slate-600">
              Approuvez les demandes en attente ou suspendez les associations actives.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                    filter === value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
          ) : associations.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">
              {EMPTY_MESSAGES[filter]}
            </div>
          ) : (
            <div className="grid gap-6">
              {associations.map((association) => (
                <div key={association.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{association.name}</h2>
                      <p className="mt-2 text-sm text-slate-600">{association.description || 'Sans description'}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span>Slug : {association.slug}</span>
                        {association.owner?.email && <span>Responsable : {association.owner.email}</span>}
                        <AssociationStatusBadge status={association.status ?? 'PENDING'} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canApprove(association.status) && (
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => updateStatus(association.id, 'approve')}
                          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approuver
                        </button>
                      )}
                      {canSuspend(association.status) && (
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => updateStatus(association.id, 'suspend')}
                          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Suspendre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
