import Link from 'next/link';
import type { Association } from '@/lib/types';
import { formatEur } from '@/lib/format';
import { AssociationAvatar } from '@/components/AssociationAvatar';

interface AssociationCardProps {
  association: Association;
  animationDelay?: number;
}

export function AssociationCard({ association, animationDelay = 0 }: AssociationCardProps) {
  const canDonate = association.stripeOnboardingComplete;
  const totalRaised = association.stats?.totalRaisedEur ?? 0;
  const donorCount = association.stats?.donorCount ?? 0;

  return (
    <article
      className="card group animate-slide-in flex h-full flex-col"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex flex-1 flex-col space-y-4">
        <AssociationAvatar name={association.name} logoUrl={association.logoUrl} size="md" />

        <div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
            {association.name}
          </h3>
          {totalRaised > 0 && (
            <p className="mt-1 text-sm font-semibold text-brand-700">
              {formatEur(totalRaised)} collectés
            </p>
          )}
        </div>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
          {association.description || 'Association vérifiée sur DonNation.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-success text-xs">Vérifiée</span>
          {canDonate ? (
            <span className="badge badge-success text-xs">Prête à recevoir</span>
          ) : (
            <span className="badge badge-warning text-xs">Stripe en cours</span>
          )}
          {donorCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {donorCount} donateur{donorCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href={`/associations/${association.slug}`}
            className="btn-secondary flex-1 text-center text-sm"
          >
            Découvrir
          </Link>
          {canDonate ? (
            <Link
              href={`/associations/${association.slug}/donate`}
              className="btn-primary flex-1 text-center text-sm"
            >
              Faire un don
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="btn-primary flex-1 cursor-not-allowed text-center text-sm opacity-50"
            >
              Dons indisponibles
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
