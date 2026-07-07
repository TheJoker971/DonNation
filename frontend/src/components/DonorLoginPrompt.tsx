'use client';

import Link from 'next/link';

export function DonorLoginPrompt() {
  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">Connectez-vous pour donner</h1>
      <p className="text-slate-600">
        Un compte donateur est requis pour effectuer un don et recevoir votre reçu certifié.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className="btn-primary text-center">
          Se connecter
        </Link>
        <Link href="/register" className="btn-secondary text-center">
          Créer un compte donateur
        </Link>
      </div>
    </div>
  );
}
