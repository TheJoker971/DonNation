'use client';

import { useEffect, useState, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Association, CreateDonationRequest, PaymentIntentResponse } from '@/lib/types';
import { CheckoutForm } from '@/components/CheckoutForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface DonatePageProps {
  params: { slug: string };
}

export default function DonatePage({ params }: DonatePageProps) {
  const { slug } = params;
  const router = useRouter();
  const [association, setAssociation] = useState<Association | null>(null);
  const [amount, setAmount] = useState('50');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [donationId, setDonationId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<Association[]>('/associations')
      .then((items) => {
        const found = items.find((item) => item.slug === slug);
        if (!found) {
          setError('Association introuvable.');
          return;
        }
        setAssociation(found);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger l’association'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCreateDonation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!association) return;

    const amountEur = Math.round(Math.max(1, Number(amount) || 0) * 100);
    setError(null);
    setCreating(true);

    try {
      const donationResponse = await api<{ donation: { id: string }; invoice: unknown }>('/donations', {
        method: 'POST',
        body: JSON.stringify({ associationId: association.id, amountEur, isAnonymous } as CreateDonationRequest),
      });

      const donationIdValue = donationResponse.donation.id;
      setDonationId(donationIdValue);

      const paymentResponse = await api<PaymentIntentResponse>(`/donations/${donationIdValue}/pay`, {
        method: 'POST',
      });

      setClientSecret(paymentResponse.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le don.');
    } finally {
      setCreating(false);
    }
  };

  const hasPaymentSection = clientSecret && donationId;

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

  if (!association) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Don à {association.name}</h1>
        <p className="mt-2 text-slate-600">Montant en euros et paiement Stripe pour l’association.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Détails du don</h2>
          <form onSubmit={handleCreateDonation} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Montant (€)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="anonymous"
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="anonymous" className="text-sm text-slate-700">
                Faire un don anonyme
              </label>
            </div>

            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Préparation du paiement...' : 'Créer le don'}
            </button>
          </form>
        </div>

        {hasPaymentSection && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Paiement Stripe</h2>
            <div className="mt-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} donationId={donationId} />
              </Elements>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
