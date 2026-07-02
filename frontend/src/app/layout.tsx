import '../styles/globals.css'
import { AuthProvider } from '@/lib/auth'
import { WalletProvider } from '@/lib/wallet'
import { Header } from '@/components/Header'

export const metadata = {
  title: 'DonNation',
  description: 'DonNation – donations Stripe + NFT pour associations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <WalletProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gradient-light text-slate-900">
              <Header />
              <main className="page-container py-8">{children}</main>
            </div>
          </AuthProvider>
        </WalletProvider>
      </body>
    </html>
  )
}

