'use client';

import { Suspense } from 'react';
import LoginPage from './LoginPageContent';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center text-slate-600">Chargement...</div>}>
      <LoginPage />
    </Suspense>
  );
}
