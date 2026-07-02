'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Accueil' },
  { href: '/associations', label: 'Associations' },
];

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="page-container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-xl font-semibold text-slate-900">
          DonNation
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                pathname === item.href ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              {user?.role === 'ADMIN' && (
                <Link href="/admin" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                  Admin
                </Link>
              )}
              {user?.role === 'ASSOCIATION' && (
                <Link href="/association" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                  Association
                </Link>
              )}
              {user?.role === 'DONOR' && (
                <Link href="/donations" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                  Mes dons
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                Connexion
              </Link>
              <Link href="/register" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
