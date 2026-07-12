'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from './LoadingSpinner';
import type { Role } from '@/lib/types';

export function RoleGuard({ allowedRoles, children }: { allowedRoles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [allowedRoles, loading, router, user]);

  if (loading || !user) {
    return <LoadingSpinner />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
        Accès non autorisé pour cette page.
      </div>
    );
  }

  return <>{children}</>;
}
