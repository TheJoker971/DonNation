'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-brand-700">DonNation</p>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Des dons transparents, des associations soutenues.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Créez un compte donateur, soutenez des associations et recevez un NFT de preuve de don après paiement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/associations" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Voir les associations
            </Link>
            {!user && (
              <Link href="/register" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                S’inscrire
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-50 p-8">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Flux V1 disponible</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Inscription / connexion</li>
                <li>Catalogue associations</li>
                <li>Paiement Stripe + webhook</li>
                <li>Mint NFT après don</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Je suis déjà</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/login" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Donateur / Association / Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
