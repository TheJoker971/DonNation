'use client';

import { useState, FormEvent } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  clientSecret: string;
  donationId: string;
}

export function CheckoutForm({ clientSecret, donationId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!stripe || !elements) {
      setError('Stripe n’est pas encore chargé.');
      return;
    }

    setIsSubmitting(true);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/donations/${donationId}`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || 'Impossible de finaliser le paiement.');
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Détails de paiement</label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <PaymentElement />
        </div>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Validation...' : 'Payer avec Stripe'}
      </button>
    </form>
  );
}
