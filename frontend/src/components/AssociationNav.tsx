'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/association', label: 'Mon espace' },
  { href: '/association/donations', label: 'Dons reçus' },
];

export function AssociationNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
