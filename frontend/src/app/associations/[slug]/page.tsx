'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { AssociationProfile } from '@/lib/types';
import { formatEur, formatEurDetailed } from '@/lib/format';
import { ApiErrorMessage } from '@/components/ApiErrorMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1600;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}

function PhotoCarousel({ photos }: { photos: { url: string; caption?: string | null }[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (index: number) => {
    setCurrent((index + photos.length) % photos.length);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % photos.length), 4500);
  };

  useEffect(() => {
    if (photos.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % photos.length), 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900" style={{ aspectRatio: '16/9' }}>
      {photos.map((photo, i) => (
        <div
          key={photo.url}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={photo.url}
            alt={photo.caption ?? `Photo ${i + 1}`}
            fill
            className="object-cover"
            priority={i === 0}
          />
          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
              <p className="text-sm text-white/90">{photo.caption}</p>
            </div>
          )}
        </div>
      ))}

      {photos.length > 1 && (
        <>
          <button
            onClick={() => { go(current - 1); resetTimer(); }}
            aria-label="Photo précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => { go(current + 1); resetTimer(); }}
            aria-label="Photo suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); resetTimer(); }}
                aria-label={`Aller à la photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AssociationProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [association, setAssociation] = useState<AssociationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api<AssociationProfile>(`/associations/${slug}`)
      .then((data) => { setAssociation(data); setError(null); })
      .catch((err) => { setError(err instanceof Error ? err.message : 'Association introuvable'); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (error || !association) {
    return (
      <ApiErrorMessage
        title="Association introuvable"
        message={error ?? "Cette association n'existe pas ou n'est pas encore approuvée."}
      />
    );
  }

  const canDonate = association.stripeOnboardingComplete;
  const { stats, recentSupporters = [], photos = [] } = association;
  const hasCoverPhoto = photos.length > 0;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-500">
        <Link href="/associations" className="hover:text-brand-600">Associations</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">{association.name}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl">
        {hasCoverPhoto ? (
          <div className="relative" style={{ aspectRatio: '21/9' }}>
            <Image
              src={photos[0].url}
              alt={`Couverture ${association.name}`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 py-24" />
        )}

        <div className={`${hasCoverPhoto ? 'absolute bottom-0 left-0 right-0' : 'absolute inset-0 flex items-end'} p-6 md:p-10`}>
          <div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-5">
              {association.logoUrl ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-xl md:h-24 md:w-24">
                  <Image src={association.logoUrl} alt={association.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl font-bold text-brand-700 shadow-xl md:h-24 md:w-24">
                  {association.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    ✓ Association vérifiée
                  </span>
                  {association.onChainRegistered && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      ⬡ Enregistrée on-chain
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-3xl font-bold text-white drop-shadow-md md:text-4xl">
                  {association.name}
                </h1>
                {association.approvedAt && (
                  <p className="mt-1 text-sm text-white/75">
                    Membre DonNation depuis{' '}
                    {new Date(association.approvedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {canDonate && (
              <Link
                href={`/associations/${association.slug}/donate`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-brand-50 hover:shadow-xl"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Soutenir cette association
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total collecté',
            value: stats.totalRaisedEur,
            display: formatEur(stats.totalRaisedEur),
            icon: (
              <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: 'Dons reçus',
            value: stats.donationCount,
            display: stats.donationCount.toString(),
            icon: (
              <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            ),
          },
          {
            label: 'Donateurs uniques',
            value: stats.donorCount,
            display: stats.donorCount.toString(),
            icon: (
              <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              {item.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {item.label === 'Total collecté' ? (
                  <AnimatedCounter target={Math.round(item.value / 100)} suffix=" €" />
                ) : (
                  <AnimatedCounter target={item.value} />
                )}
              </p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Main content grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Mission */}
          <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <svg className="h-5 w-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Notre mission
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-600">
              {association.description ||
                "Cette association n'a pas encore rédigé sa présentation. Votre don contribue directement à ses actions sur le terrain."}
            </p>
          </section>

          {/* Photo gallery carousel */}
          {photos.length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-slate-900">
                <svg className="h-5 w-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Nos actions en images
                <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {photos.length} photo{photos.length > 1 ? 's' : ''}
                </span>
              </h2>
              <PhotoCarousel photos={photos} />

              {photos.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {photos.slice(0, 5).map((photo, i) => (
                    <div key={photo.url} className="relative aspect-square overflow-hidden rounded-xl">
                      <Image src={photo.url} alt={photo.caption ?? `Photo ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Trust section */}
          <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-600 p-8 text-white shadow-sm">
            <h2 className="text-xl font-semibold">Pourquoi nous faire confiance ?</h2>
            <p className="mt-2 text-sm text-brand-100">
              DonNation garantit la transparence totale de chaque don grâce à la blockchain.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: '✓', title: 'Association validée', desc: "L'équipe DonNation vérifie chaque association avant approbation." },
                { icon: '🔒', title: 'Paiement sécurisé', desc: 'Vos transactions sont traitées par Stripe Connect, leader mondial.' },
                { icon: '⬡', title: 'Reçu certifié on-chain', desc: 'Chaque don génère un NFT-reçu infalsifiable sur la blockchain.' },
                { icon: '📄', title: 'Reçu fiscal PDF', desc: 'Téléchargez votre reçu fiscal à tout moment pour votre déclaration.' },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-100">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-6">
          {/* Donation CTA card */}
          <div className="sticky top-6 space-y-4">
            {canDonate ? (
              <div className="rounded-3xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-6 shadow-sm">
                <div className="mb-4 text-center">
                  <p className="text-sm font-medium text-slate-500">Chaque euro compte</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatEur(stats.totalRaisedEur)} collectés
                  </p>
                  {stats.donorCount > 0 && (
                    <p className="mt-1 text-sm text-slate-500">
                      grâce à {stats.donorCount} donateur{stats.donorCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Progress bar (visual only) */}
                <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round((stats.totalRaisedEur / 100000) * 100))}%` }}
                  />
                </div>

                <Link
                  href={`/associations/${association.slug}/donate`}
                  className="block w-full rounded-2xl bg-brand-600 py-4 text-center text-sm font-bold text-white shadow transition hover:bg-brand-700 hover:shadow-lg"
                >
                  Faire un don maintenant
                </Link>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Paiement sécurisé · Reçu fiscal inclus
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                <p className="font-semibold">Configuration en cours</p>
                <p className="mt-1 text-amber-700">
                  Cette association finalise sa configuration Stripe. Revenez bientôt pour faire un don.
                </p>
              </div>
            )}

            {/* Recent supporters */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <svg className="h-4 w-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                Derniers soutiens
              </h3>

              {recentSupporters.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Soyez le premier à soutenir cette association.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {recentSupporters.map((supporter, index) => (
                    <li
                      key={`${supporter.createdAt}-${index}`}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                        {supporter.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{supporter.displayName}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(supporter.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-brand-700">
                        {formatEurDetailed(supporter.amountEur)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {canDonate && (
                <Link
                  href={`/associations/${association.slug}/donate`}
                  className="mt-4 block w-full rounded-xl border border-brand-200 py-2.5 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  Rejoindre les soutiens
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
