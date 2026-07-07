'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Association, CreateDonationRequest, PaymentIntentResponse } from '@/lib/types';
import { AssociationAvatar } from '@/components/AssociationAvatar';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { CheckoutForm } from '@/components/CheckoutForm';
import { DonorLoginPrompt } from '@/components/DonorLoginPrompt';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface DonatePageProps {
  params: { slug: string };
}

export default function DonatePage({ params }: DonatePageProps) {
  const { slug } = params;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
          setError(`Aucune association approuvée avec le slug « ${slug} ».`);
          return;
        }
        if (!found.stripeOnboardingComplete) {
          setError('Cette association n\'est pas encore prête à recevoir des dons.');
          return;
        }
        setAssociation(found);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger l’association');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCreateDonation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!association) return;

    const amountEur = Math.round(Math.max(1, Number(amount) || 0) * 100);
    setError(null);
    setCreating(true);

    try {
      const donationResponse = await api<{ donation: { id: string } }>('/donations', {
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

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <DonorLoginPrompt />;
  }

  if (user?.role !== 'DONOR') {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">Compte incompatible</h1>
        <p className="text-amber-800">
          Seuls les comptes <strong>donateur</strong> peuvent effectuer un don. Connectez-vous avec un
          compte donateur ou créez-en un.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Changer de compte
          </Link>
          <Link href="/register" className="btn-secondary">
            Créer un compte donateur
          </Link>
        </div>
      </div>
    );
  }

  if (error && !association) {
    return <ApiErrorMessage title="Association introuvable" message={error} />;
  }

  if (!association) {
    return null;
  }

  const hasPaymentSection = clientSecret && donationId;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <AssociationAvatar name={association.name} logoUrl={association.logoUrl} size="lg" />
          <div>
            <h1 className="text-3xl font-semibold">Don à {association.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {association.description || 'Soutenez cette association vérifiée.'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Donateur connecté : {user.email}</p>
          </div>
        </div>
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
                step="1"
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

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || Boolean(hasPaymentSection)}
              className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Préparation du paiement...' : 'Continuer vers le paiement'}
            </button>
          </form>
        </div>

        {hasPaymentSection && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Paiement sécurisé</h2>
            <p className="mt-2 text-sm text-slate-600">Paiement par carte via Stripe.</p>
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
