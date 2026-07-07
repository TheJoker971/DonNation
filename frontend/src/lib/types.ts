export type Role = 'ADMIN' | 'ASSOCIATION' | 'DONOR';

export interface User {
  id: string;
  email: string;
  role: Role;
  displayName?: string | null;
  walletAddress?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface RegisterAssociationRequest {
  email: string;
  password: string;
  name: string;
  description?: string;
}

export interface CreateDonationRequest {
  associationId: string;
  amountEur: number;
  isAnonymous?: boolean;
}

export interface Association {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  stripeConnectAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
  onChainRegistered?: boolean;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  owner?: User;
}

export interface Donation {
  id: string;
  donorId: string;
  associationId: string;
  amountEur: number;
  pointsEarned: number;
  isAnonymous: boolean;
  status: 'PENDING' | 'PAID' | 'MINTING' | 'COMPLETED' | 'FAILED';
  stripePaymentIntentId?: string | null;
  donorWallet?: string | null;
  createdAt: string;
  updatedAt: string;
  association?: {
    id: string;
    name: string;
    slug: string;
  };
  invoice?: Invoice | null;
}

export interface Invoice {
  id: string;
  donationId: string;
  externalPaymentIdHash?: string | null;
  receiptHash?: string | null;
  tokenId?: number | null;
  txHash?: string | null;
  chainId?: number | null;
  metadataUrl?: string | null;
  pdfUrl?: string | null;
  status: 'PENDING' | 'MINTED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface ReceivedDonation {
  id: string;
  amountEur: number;
  pointsEarned: number;
  isAnonymous: boolean;
  status: 'PAID' | 'MINTING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  donor: {
    displayName?: string | null;
    email: string;
  } | null;
  invoice: {
    id: string;
    status: 'PENDING' | 'MINTED' | 'FAILED';
    tokenId?: number | null;
    pdfUrl?: string | null;
  } | null;
}

export interface ReceiptResponse {
  pdfUrl: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface AuthState {
  accessToken: string | null;
  user: User | null;
}
