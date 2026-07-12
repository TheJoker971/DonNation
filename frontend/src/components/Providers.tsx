'use client';

import React from 'react';
import { createAppKit } from '@reown/appkit/react';
import { AuthProvider } from '@/lib/auth';
import { appkitMetadata, ethersAdapter, networks, projectId } from '@/lib/appkit-config';

createAppKit({
  adapters: [ethersAdapter],
  networks,
  projectId,
  metadata: appkitMetadata,
  features: {
    analytics: false,
    socials: ['google', 'apple'],
    email: true,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': 'Inter, sans-serif',
    '--w3m-accent': '#1e293b',
    '--w3m-border-radius-master': '12px',
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
