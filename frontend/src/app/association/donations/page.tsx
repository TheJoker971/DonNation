'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ReceivedDonation, ReceiptResponse } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DonationStatusBadge } from '@/components/DonationStatusBadge';
import { AssociationNav } from '@/components/AssociationNav';

export default function AssociationDonationsPage() {
  const [donations, setDonations] = useState<ReceivedDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    api<ReceivedDonation[]>('/associations/me/donations')
      .then((data) => setDonations(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les dons'))
      .finally(() => setLoading(false));
  }, []);

  const downloadReceipt = async (donationId: string) => {
    setDownloadingId(donationId);
    try {
      const { pdfUrl } = await api<ReceiptResponse>(`/associations/me/donations/${donationId}/receipt`);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le reçu');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Dons reçus</h1>
                <p className="mt-2 text-slate-600">Historique des paiements reçus par votre association.</p>
              </div>
              <AssociationNav />
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
          ) : donations.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">
              Aucun don reçu pour le moment.
            </div>
          ) : (
            <div className="grid gap-6">
              {donations.map((donation) => (
                <div key={donation.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {(donation.amountEur / 100).toFixed(2)} €
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {donation.isAnonymous
                          ? 'Donateur anonyme'
                          : donation.donor?.displayName || donation.donor?.email || 'Donateur'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(donation.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <DonationStatusBadge status={donation.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {donation.invoice?.tokenId != null && (
                      <span className="text-sm text-slate-600">NFT #{donation.invoice.tokenId}</span>
                    )}
                    {(donation.status === 'PAID' || donation.status === 'COMPLETED') && (
                      <button
                        type="button"
                        disabled={downloadingId === donation.id}
                        onClick={() => downloadReceipt(donation.id)}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingId === donation.id ? 'Génération...' : 'Télécharger le reçu PDF'}
                      </button>
                    )}
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
