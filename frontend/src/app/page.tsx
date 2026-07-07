'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Association } from '@/lib/types'
import { AssociationAvatar } from '@/components/AssociationAvatar'
import { ApiErrorMessage } from '@/components/ApiErrorMessage'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function HomePage() {
  const { user } = useAuth()
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        setAssociations(data.slice(0, 6))
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les associations')
      })
      .finally(() => setLoading(false))
  }, [])

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
              Soutenez des associations vérifiées par carte bancaire. Chaque don est tracé et
              certifié par un reçu numérique.
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
          <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">
            Associations vérifiées
          </h2>
          <p className="mt-2 text-lg text-slate-600">
            Données en direct depuis l&apos;API DonNation
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
            {associations.map((association, idx) => (
              <div
                key={association.id}
                className="card group animate-slide-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="space-y-4">
                  <AssociationAvatar name={association.name} logoUrl={association.logoUrl} />

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{association.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{association.slug}</p>
                  </div>

                  <p className="line-clamp-3 text-sm text-slate-600">
                    {association.description || 'Aucune description.'}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="badge badge-success text-xs">Approuvée</span>
                    {association.stripeOnboardingComplete ? (
                      <span className="badge badge-success text-xs">Prête à recevoir</span>
                    ) : (
                      <span className="badge badge-warning text-xs">Stripe en cours</span>
                    )}
                  </div>

                  {association.stripeOnboardingComplete ? (
                    <Link
                      href={`/associations/${association.slug}/donate`}
                      className="btn-primary mt-4 block text-center text-sm"
                    >
                      Faire un don
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn-primary mt-4 block w-full cursor-not-allowed text-center text-sm opacity-50"
                    >
                      Dons indisponibles
                    </button>
                  )}
                </div>
              </div>
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
              icon: '👤',
              title: 'Créez votre compte',
              description:
                'Inscrivez-vous en tant que donateur avec votre email et mot de passe.',
            },
            {
              icon: '💳',
              title: 'Faites un don sécurisé',
              description:
                'Choisissez une association vérifiée et payez par carte via Stripe.',
            },
            {
              icon: '🎖️',
              title: 'Recevez votre reçu certifié',
              description:
                'Obtenez un reçu numérique tracé après chaque don validé.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card space-y-4">
              <div className="text-5xl">{feature.icon}</div>
              <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
