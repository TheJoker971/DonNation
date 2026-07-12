'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Association } from '@/lib/types';
import { AssociationCard } from '@/components/AssociationCard';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function HomePage() {
  const { user } = useAuth();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        setAssociations(data.slice(0, 6));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les associations');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16">
      <section className="space-y-8">
        <div className="animate-fade-in rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-brand-50 p-12 shadow-sm">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
                Bienvenue sur DonNation
              </p>
              <h1 className="mt-3 text-5xl font-bold leading-tight lg:text-6xl">
                <span className="text-gradient">Des dons transparents,</span>
                <br />
                un impact réel
              </h1>
            </div>

            <p className="max-w-2xl text-xl leading-relaxed text-slate-600">
              Soutenez des associations vérifiées par carte bancaire. Chaque don est tracé, certifié
              on-chain et accompagné d&apos;un reçu PDF.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/associations" className="btn-primary">
                Découvrir les associations
              </Link>
              {!user && (
                <Link href="/register" className="btn-secondary">
                  Créer un compte donateur
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Associations à soutenir</h2>
          <p className="mt-2 text-lg text-slate-600">
            Parcourez les profils, découvrez leurs missions et choisissez votre impact.
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ApiErrorMessage message={error} />
        ) : associations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
            Aucune association approuvée pour le moment.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {associations.map((association, index) => (
              <AssociationCard
                key={association.id}
                association={association}
                animationDelay={index * 100}
              />
            ))}
          </div>
        )}

        {!error && associations.length > 0 && (
          <div className="pt-4 text-center">
            <Link
              href="/associations"
              className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir toutes les associations
              <span>→</span>
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">Comment ça marche</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Découvrez une association',
              description:
                'Consultez le profil, la mission et l\'impact de chaque structure vérifiée.',
            },
            {
              step: '2',
              title: 'Faites un don sécurisé',
              description:
                'Payez par carte via Stripe Connect. L\'association reçoit les fonds en euros.',
            },
            {
              step: '3',
              title: 'Recevez votre preuve',
              description:
                'Obtenez un reçu PDF et un certificat on-chain — preuve immuable de votre générosité.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {feature.step}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
