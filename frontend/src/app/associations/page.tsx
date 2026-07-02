'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { MOCK_ASSOCIATIONS } from '@/lib/mocks'
import type { Association } from '@/lib/types'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMocks, setUseMocks] = useState(false)

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        if (data && data.length > 0) {
          setAssociations(data)
        } else {
          // If API returns empty, use mocks
          setAssociations(MOCK_ASSOCIATIONS)
          setUseMocks(true)
        }
      })
      .catch((err) => {
        // On error, fallback to mocks
        console.warn('Failed to load associations, using mock data:', err)
        setAssociations(MOCK_ASSOCIATIONS)
        setUseMocks(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-gradient">Nos associations</h1>
        <p className="mt-3 text-lg text-slate-600">
          Découvrez nos partenaires et contribuez à leurs causes avec des dons sécurisés.
        </p>
        {useMocks && (
          <p className="mt-4 inline-block rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
            Données de démonstration
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {associations.map((association) => (
          <div
            key={association.id}
            className="card group animate-slide-in hover:shadow-lg"
          >
            <div className="space-y-4">
              {/* Logo */}
              <div className="text-4xl">{association.logoUrl}</div>

              {/* Name */}
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {association.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  {association.slug}
                </p>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 line-clamp-2">
                {association.description || 'Pas de description fournie.'}
              </p>

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2">
                <span
                  className={`badge text-xs ${
                    association.status === 'APPROVED'
                      ? 'badge-success'
                      : association.status === 'PENDING'
                        ? 'badge-warning'
                        : 'badge-error'
                  }`}
                >
                  {association.status === 'APPROVED'
                    ? 'Approuvée'
                    : association.status === 'PENDING'
                      ? 'En attente'
                      : 'Suspendue'}
                </span>
                {association.stripeOnboardingComplete && (
                  <span className="badge badge-success text-xs">Stripe OK</span>
                )}
              </div>

              {/* CTA Button */}
              <div className="pt-2">
                {association.status === 'APPROVED' &&
                association.stripeOnboardingComplete ? (
                  <Link
                    href={`/associations/${association.slug}/donate`}
                    className="btn-primary block text-center text-sm"
                  >
                    Faire un don
                  </Link>
                ) : (
                  <button
                    disabled
                    className="btn-primary block w-full text-center text-sm opacity-50 cursor-not-allowed"
                  >
                    Non disponible
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {associations.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-slate-600">Aucune association disponible pour le moment.</p>
        </div>
      )}
    </div>
  )
}
