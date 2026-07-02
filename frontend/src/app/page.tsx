'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { MOCK_ASSOCIATIONS } from '@/lib/mocks'
import { useAuth } from '@/lib/auth'
import type { Association } from '@/lib/types'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function HomePage() {
  const { user } = useAuth()
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(true)
  const [useMocks, setUseMocks] = useState(false)

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        if (data && data.length > 0) {
          setAssociations(data.slice(0, 6)) // Featured associations
        } else {
          setAssociations(MOCK_ASSOCIATIONS.slice(0, 6))
          setUseMocks(true)
        }
      })
      .catch((err) => {
        console.warn('Failed to load associations:', err)
        setAssociations(MOCK_ASSOCIATIONS.slice(0, 6))
        setUseMocks(true)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="space-y-8">
        <div className="animate-fade-in rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-12 shadow-sm">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-brand-600 font-semibold">
                Bienvenue sur DonNation
              </p>
              <h1 className="mt-3 text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-gradient">Des dons transparents,</span>
                <br />
                des associations soutenues
              </h1>
            </div>

            <p className="max-w-2xl text-xl text-slate-600 leading-relaxed">
              Connectez votre portefeuille Web3, soutenez des associations et recevez un NFT de preuve de don.
              Transparent, sécurisé, tracé sur la blockchain.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/associations" className="btn-primary">
                Explorer les associations
              </Link>
              {!user && (
                <Link href="/login" className="btn-secondary">
                  Se connecter
                </Link>
              )}
            </div>

            {useMocks && (
              <p className="inline-block rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-800 font-medium">
                Mode démonstration avec données d'exemple
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Associations */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Nos associations partenaires
          </h2>
          <p className="mt-2 text-lg text-slate-600">
            Découvrez les organisations que nous soutienons
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {associations.map((association, idx) => (
              <div
                key={association.id}
                className="card group animate-slide-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="space-y-4">
                  {/* Logo */}
                  <div className="text-5xl">{association.logoUrl}</div>

                  {/* Name & Slug */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {association.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {association.slug}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {association.description}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {association.status === 'APPROVED' && (
                      <span className="badge badge-success text-xs">
                        Approuvée
                      </span>
                    )}
                    {association.stripeOnboardingComplete && (
                      <span className="badge badge-success text-xs">
                        Prête à recevoir
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {association.status === 'APPROVED' &&
                  association.stripeOnboardingComplete ? (
                    <Link
                      href={`/associations/${association.slug}/donate`}
                      className="btn-primary block text-center text-sm mt-4"
                    >
                      Faire un don
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="btn-primary block w-full text-center text-sm mt-4 opacity-50 cursor-not-allowed"
                    >
                      Non disponible
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <Link
            href="/associations"
            className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700"
          >
            Voir toutes les associations
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-6">
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
          Comment ça marche
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: '🔗',
              title: 'Connectez votre portefeuille',
              description:
                'Utilisez MetaMask ou tout portefeuille Web3 compatible pour vous identifier de manière sécurisée.',
            },
            {
              icon: '❤️',
              title: 'Faites un don',
              description:
                'Choisissez une association et contribuez via Stripe ou directement avec votre portefeuille.',
            },
            {
              icon: '🎖️',
              title: 'Recevez votre NFT',
              description:
                'Obtenez un certificat NFT qui prouve votre contribution de façon permanente et transparente.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card space-y-4">
              <div className="text-5xl">{feature.icon}</div>
              <h3 className="text-lg font-bold text-slate-900">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
