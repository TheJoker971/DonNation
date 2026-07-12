'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Donation, ReceiptResponse } from '@/lib/types';
import { formatEurDetailed, truncateHash } from '@/lib/format';
import { getTxExplorerUrl } from '@/lib/blockchain';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DonationStatusBadge } from '@/components/DonationStatusBadge';

export default function DonationDetailsPage() {
  const params = useParams();
  const donationId = params?.id ?? '';
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchDonation = async () => {
      try {
        const data = await api<Donation>(`/donations/${donationId}`);
        setDonation(data);
        setError(null);
        if (data.status !== 'COMPLETED' && data.status !== 'FAILED' && !interval) {
          interval = setInterval(fetchDonation, 5000);
        }
        if ((data.status === 'COMPLETED' || data.status === 'FAILED') && interval) {
          clearInterval(interval);
          interval = null;
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
      if (interval) clearInterval(interval);
    };
  }, [donationId]);

  const downloadReceipt = async () => {
    if (!donationId) return;
    setDownloadingReceipt(true);
    try {
      const { pdfUrl } = await api<ReceiptResponse>(`/donations/${donationId}/receipt`);
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le reçu');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const canDownloadReceipt =
    donation &&
    (donation.status === 'PAID' || donation.status === 'COMPLETED' || donation.status === 'MINTING');

  const explorerUrl =
    donation?.invoice?.txHash && donation.invoice.chainId
      ? getTxExplorerUrl(donation.invoice.chainId, donation.invoice.txHash)
      : null;

  return (
    <AuthGuard>
      <div className="space-y-6">
        <nav className="text-sm text-slate-500">
          <Link href="/donations" className="hover:text-brand-600">
            Mes dons
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-slate-900">Détail du don</span>
        </nav>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Confirmation de don</h1>
          <p className="mt-2 text-slate-600">Suivi du paiement, du reçu certifié et de la preuve on-chain.</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
        ) : !donation ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">Don inconnu.</div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Association</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {donation.association?.name || 'Association'}
                  </h2>
                  {donation.association?.slug && (
                    <Link
                      href={`/associations/${donation.association.slug}`}
                      className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Voir le profil de l&apos;association →
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-brand-700">{formatEurDetailed(donation.amountEur)}</p>
                  <div className="mt-3 flex justify-end">
                    <DonationStatusBadge status={donation.status} />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Date',
                    value: new Date(donation.createdAt).toLocaleString('fr-FR'),
                  },
                  { label: 'Points gagnés', value: `+${donation.pointsEarned}` },
                  { label: 'Anonyme', value: donation.isAnonymous ? 'Oui' : 'Non' },
                  {
                    label: 'Wallet donateur',
                    value: donation.donorWallet ? truncateHash(donation.donorWallet, 6, 4) : 'Non renseigné',
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {canDownloadReceipt && (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900">Reçu PDF</h3>
                    <p className="mt-2 text-sm text-emerald-800">
                      Téléchargez votre reçu officiel de donation, généré après validation du paiement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadReceipt}
                    disabled={downloadingReceipt}
                    className="inline-flex shrink-0 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingReceipt ? 'Génération...' : 'Télécharger le PDF'}
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl">
                  ⛓
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Reçu certifié on-chain</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Preuve immuable enregistrée sur la blockchain — garantie d&apos;intégrité de votre don.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-500">Statut mint</p>
                      <p className="mt-2 font-medium text-slate-800">{donation.invoice?.status || 'En attente'}</p>
                    </div>
                    {donation.invoice?.tokenId != null && (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase text-slate-500">Token ID</p>
                        <p className="mt-2 font-medium text-slate-800">#{donation.invoice.tokenId}</p>
                      </div>
                    )}
                    {donation.invoice?.receiptHash && (
                      <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Hash du reçu</p>
                        <p className="mt-2 break-all font-mono text-sm text-slate-700">
                          {truncateHash(donation.invoice.receiptHash, 12, 8)}
                        </p>
                      </div>
                    )}
                  </div>

                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Voir la transaction sur l&apos;explorateur →
                    </a>
                  )}

                  {donation.status === 'MINTING' && (
                    <p className="mt-4 text-sm text-amber-700">
                      Mint en cours… cette page se met à jour automatiquement.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
