'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api, apiUpload } from '@/lib/api';
import type { Association, AssociationPhoto } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { RoleGuard } from '@/components/RoleGuard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AssociationStatusBadge } from '@/components/AssociationStatusBadge';
import { AssociationAvatar } from '@/components/AssociationAvatar';
import { AssociationNav } from '@/components/AssociationNav';

export default function AssociationDashboardPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [photos, setPhotos] = useState<AssociationPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchAssociation = async () => {
    setLoading(true);
    try {
      const data = await api<Association & { photos?: AssociationPhoto[] }>('/associations/me');
      setAssociation(data);
      setDescription(data.description ?? '');
      if (data.slug) {
        try {
          const pub = await api<{ photos?: AssociationPhoto[] }>(`/associations/${data.slug}`);
          setPhotos(pub.photos ?? []);
        } catch {
          // ignore
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotosChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setUploadingPhotos(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('photos', f));
      const created = await apiUpload<AssociationPhoto[]>('/associations/me/photos', formData);
      setPhotos((prev) => [...prev, ...created]);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Erreur lors de l\'upload des photos');
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      await api(`/associations/me/photos/${photoId}`, { method: 'DELETE' });
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Impossible de supprimer la photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  useEffect(() => {
    fetchAssociation();
  }, []);

  const handleStripeOnboard = async () => {
    setOnboarding(true);
    try {
      const response = await api<{ url: string }>('/associations/me/stripe/onboard', { method: 'POST' });
      window.location.href = response.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer Stripe');
    } finally {
      setOnboarding(false);
    }
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const updated = await apiUpload<Association>('/associations/me/logo', formData);
      setAssociation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    setError(null);
    try {
      const updated = await api<Association>('/associations/me', {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      });
      setAssociation(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour la description');
    } finally {
      setSavingDescription(false);
    }
  };

  const publicUrl = association?.publicProfileUrl ?? `/associations/${association?.slug ?? ''}`;

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['ASSOCIATION']}>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard association</h1>
            <p className="mt-2 text-slate-600">Gérez votre profil public, Stripe et vos dons.</p>
            <div className="mt-6">
              <AssociationNav />
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
          ) : !association ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm">
              Aucune association trouvée.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Aperçu du profil public</h2>
                  <p className="mt-1 text-sm text-slate-500">Ce que les donateurs voient sur votre page.</p>

                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-start gap-4">
                      <AssociationAvatar name={association.name} logoUrl={association.logoUrl} size="lg" />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{association.name}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {description || 'Ajoutez une description pour présenter votre association.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {association.status === 'APPROVED' ? (
                    <Link
                      href={publicUrl.startsWith('http') ? publicUrl : `/associations/${association.slug}`}
                      target={publicUrl.startsWith('http') ? '_blank' : undefined}
                      className="mt-4 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      Voir ma page publique →
                    </Link>
                  ) : (
                    <p className="mt-4 text-sm text-amber-700">Page publique disponible après validation admin.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Description</h2>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    maxLength={2000}
                    className="mt-4 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="Présentez votre mission, vos actions, votre impact..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                    className="mt-4 inline-flex rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingDescription ? 'Enregistrement...' : 'Enregistrer la description'}
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Logo</h2>
                  <p className="mt-1 text-sm text-slate-500">JPG, PNG ou WebP — max 2 Mo.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  />
                  {uploadingLogo && <p className="mt-2 text-sm text-slate-500">Upload en cours...</p>}
                </div>

                {/* Photos gallery management */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Photos d&apos;événements</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {"Jusqu'à 10 photos — elles s'affichent en carousel sur votre page publique."}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {photos.length}/10
                    </span>
                  </div>

                  {photoError && (
                    <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{photoError}</p>
                  )}

                  {photos.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                          <Image
                            src={photo.url}
                            alt={photo.caption ?? 'Photo'}
                            fill
                            className="object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                              <p className="truncate text-xs text-white">{photo.caption}</p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={deletingPhotoId === photo.id}
                            aria-label="Supprimer cette photo"
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-700 disabled:cursor-not-allowed"
                          >
                            {deletingPhotoId === photo.id ? (
                              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {photos.length < 10 && (
                    <>
                      <label
                        htmlFor="photo-upload"
                        className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50 ${uploadingPhotos ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        {uploadingPhotos ? (
                          <>
                            <svg className="h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm text-slate-500">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-600">
                              Cliquer pour ajouter des photos
                            </span>
                            <span className="text-xs text-slate-400">JPG, PNG ou WebP · max 5 Mo chacune</span>
                          </>
                        )}
                      </label>
                      <input
                        id="photo-upload"
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handlePhotosChange}
                        className="sr-only"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Statut</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>
                      Validation : <AssociationStatusBadge status={association.status ?? 'PENDING'} />
                    </p>
                    <p>
                      Stripe :{' '}
                      <span className="font-medium text-slate-900">
                        {association.stripeOnboardingComplete ? 'Connecté' : 'À configurer'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Actions</h2>
                  <div className="mt-6 space-y-4">
                    <Link
                      href="/association/donations"
                      className="inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      Voir les dons reçus
                    </Link>

                    {!association.stripeOnboardingComplete && (
                      <button
                        type="button"
                        onClick={handleStripeOnboard}
                        disabled={onboarding}
                        className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {onboarding ? 'Redirection Stripe...' : 'Connecter Stripe'}
                      </button>
                    )}

                    {association.status !== 'APPROVED' && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        En attente de validation admin.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AuthGuard>
  );
}
