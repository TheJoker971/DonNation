'use client';

import { useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticate } from '@/lib/api';
import { useAuth, getRoleRedirect } from '@/lib/auth';
import { slugify } from '@/lib/slugify';

export default function RegisterAssociationPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const slugPreview = useMemo(() => slugify(name), [name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const auth = await authenticate('/auth/register/association', {
        email,
        password,
        name,
        description,
      });
      login(auth);
      router.push(getRoleRedirect(auth.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’inscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">Inscription association</h1>
      <p className="mt-2 text-slate-600">Créez un espace association et soumettez votre dossier pour approbation.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Nom de l’association</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {slugPreview && (
            <p className="text-sm text-slate-500">
              Adresse publique : <span className="font-medium text-slate-700">{slugPreview}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Email admin</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Inscription...' : 'Soumettre ma demande'}
        </button>
      </form>

      <p className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
        Vous êtes un donateur ?{' '}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Inscription donateur
        </Link>
        {' · '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Connexion
        </Link>
      </p>
    </div>
  );
}
