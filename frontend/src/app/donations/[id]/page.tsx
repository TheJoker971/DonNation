'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Donation } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DonationStatusBadge } from '@/components/DonationStatusBadge';

export default function DonationDetailsPage() {
  const params = useParams();
  const donationId = params?.id ?? '';
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const fetchDonation = async () => {
      try {
        const data = await api<Donation>(`/donations/${donationId}`);
        setDonation(data);
        setError(null);
        if (data.status !== 'COMPLETED' && !interval) {
          interval = setInterval(fetchDonation, 5000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le don');
      } finally {
        setLoading(false);
      }
    };

    if (donationId) {
      fetchDonation();
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [donationId]);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Détails du don</h1>
          <p className="mt-2 text-slate-600">Suivi du paiement et du NFT minté.</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
        ) : !donation ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">Don inconnu.</div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{donation.association?.name || 'Association'}</h2>
                <p className="mt-2 text-sm text-slate-600">Montant : {(donation.amountEur / 100).toFixed(2)} €</p>
              </div>
              <DonationStatusBadge status={donation.status} />
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">Date</p>
                <p className="mt-3 text-sm text-slate-600">{new Date(donation.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">Anonyme</p>
                <p className="mt-3 text-sm text-slate-600">{donation.isAnonymous ? 'Oui' : 'Non'}</p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-700">Status NFT</h3>
                <p className="mt-3 text-sm text-slate-600">{donation.invoice?.status || 'Aucun reçu trouvé'}</p>
                {donation.invoice?.tokenId != null && (
                  <p className="mt-2 text-sm text-slate-600">Token ID : {donation.invoice.tokenId}</p>
                )}
                {donation.invoice?.txHash && (
                  <p className="mt-2 break-words text-sm text-slate-600">TxHash : {donation.invoice.txHash}</p>
                )}
                {donation.invoice?.chainId && (
                  <p className="mt-2 text-sm text-slate-600">ChainId : {donation.invoice.chainId}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
