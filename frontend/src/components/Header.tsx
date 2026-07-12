'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getRoleLabel } from '@/lib/roles'

const navItems = [
  { href: '/', label: 'Accueil' },
  { href: '/associations', label: 'Associations' },
]

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="page-container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="text-2xl font-bold text-transparent bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text"
        >
          DonNation
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 md:flex">
                <span className="text-sm font-medium text-slate-900">{user.email}</span>
                <span className="badge badge-success text-xs">{getRoleLabel(user.role)}</span>
              </div>

              {user.role === 'ADMIN' && (
                <Link href="/admin" className="btn-primary">
                  Admin
                </Link>
              )}
              {user.role === 'ASSOCIATION' && (
                <Link href="/association" className="btn-primary">
                  Mon espace
                </Link>
              )}
              {user.role === 'DONOR' && (
                <Link href="/donations" className="btn-primary">
                  Mes dons
                </Link>
              )}

              <button type="button" onClick={logout} className="btn-secondary">
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
