'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Association } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AssociationStatusBadge } from '@/components/AssociationStatusBadge';

export default function AdminPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchAssociations = async () => {
    setLoading(true);
    try {
      const data = await api<Association[]>('/admin/associations?status=PENDING');
      setAssociations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les associations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociations();
  }, []);

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

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ADMIN']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Admin associations</h1>
            <p className="mt-2 text-slate-600">Approuvez ou suspendez les associations en attente.</p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
          ) : associations.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">Aucune association en attente.</div>
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
                        <AssociationStatusBadge status={association.status ?? 'PENDING'} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => updateStatus(association.id, 'approve')}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => updateStatus(association.id, 'suspend')}
                        className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Suspendre
                      </button>
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
