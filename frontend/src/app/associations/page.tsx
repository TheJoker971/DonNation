'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Association } from '@/lib/types'
import { AssociationAvatar } from '@/components/AssociationAvatar'
import { ApiErrorMessage } from '@/components/ApiErrorMessage'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function AssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Association[]>('/associations')
      .then((data) => {
        setAssociations(data)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Impossible de charger les associations')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-gradient">Associations vérifiées</h1>
        <p className="mt-3 text-lg text-slate-600">
          Liste des associations approuvées, chargée depuis l&apos;API en temps réel.
        </p>
        {!error && (
          <p className="mt-4 text-sm text-slate-500">
            {associations.length} association{associations.length > 1 ? 's' : ''} disponible
            {associations.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error ? (
        <ApiErrorMessage message={error} />
      ) : associations.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
          Aucune association approuvée pour le moment.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {associations.map((association) => (
            <div key={association.id} className="card group animate-slide-in hover:shadow-lg">
              <div className="space-y-4">
                <AssociationAvatar name={association.name} logoUrl={association.logoUrl} />

                <div>
                  <h2 className="text-xl font-bold text-slate-900">{association.name}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{association.slug}</p>
                </div>

                <p className="line-clamp-2 text-sm text-slate-600">
                  {association.description || 'Pas de description fournie.'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="badge badge-success text-xs">Approuvée</span>
                  {association.stripeOnboardingComplete ? (
                    <span className="badge badge-success text-xs">Stripe connecté</span>
                  ) : (
                    <span className="badge badge-warning text-xs">Stripe en cours</span>
                  )}
                </div>

                <div className="pt-2">
                  {association.stripeOnboardingComplete ? (
                    <Link
                      href={`/associations/${association.slug}/donate`}
                      className="btn-primary block text-center text-sm"
                    >
                      Faire un don
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn-primary block w-full cursor-not-allowed text-center text-sm opacity-50"
                    >
                      Dons indisponibles
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
