import { Injectable } from '@nestjs/common';
import { AuthProvider, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CreateEmailDonorInput = {
  email: string;
  passwordHash: string;
  displayName?: string;
};

type CreateGoogleDonorInput = {
  email: string;
  googleId: string;
  displayName?: string;
  walletAddress: string;
  walletPrivateKeyEncrypted: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { walletAddress } });
  }

  findByPasswordResetTokenHash(tokenHash: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash },
    });
  }

  createDonorWithEmail(data: CreateEmailDonorInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: Role.DONOR,
        authProvider: AuthProvider.EMAIL,
        displayName: data.displayName,
      },
    });
  }

  createDonorWithGoogle(data: CreateGoogleDonorInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        role: Role.DONOR,
        authProvider: AuthProvider.GOOGLE,
        googleId: data.googleId,
        displayName: data.displayName,
        walletAddress: data.walletAddress,
        walletPrivateKeyEncrypted: data.walletPrivateKeyEncrypted,
      },
    });
  }

  createDonorWithWallet(walletAddress: string): Promise<User> {
    const syntheticEmail = `${walletAddress.slice(2, 10)}.${Date.now()}@wallet.donnation.local`;
    return this.prisma.user.create({
      data: {
        email: syntheticEmail,
        role: Role.DONOR,
        authProvider: AuthProvider.WALLET,
        walletAddress,
      },
    });
  }

  linkGoogleAccount(
    userId: string,
    googleId: string,
    displayName?: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        authProvider: AuthProvider.GOOGLE,
        displayName: displayName ?? undefined,
      },
    });
  }

  upsertWalletNonce(
    walletAddress: string,
    nonce: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.upsert({
      where: { walletAddress },
      create: {
        email: `${walletAddress.slice(2, 10)}.${Date.now()}@wallet.donnation.local`,
        role: Role.DONOR,
        authProvider: AuthProvider.WALLET,
        walletAddress,
        walletAuthNonce: nonce,
        walletAuthNonceExpiresAt: expiresAt,
      },
      update: {
        walletAuthNonce: nonce,
        walletAuthNonceExpiresAt: expiresAt,
      },
    });
  }

  clearWalletNonce(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { walletAuthNonce: null, walletAuthNonceExpiresAt: null },
    });
  }

  setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });
  }

  updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  linkWalletAddress(userId: string, walletAddress: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: walletAddress.toLowerCase(),
        authProvider: AuthProvider.WALLET,
      },
    });
  }

  toPublic(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    };
  }
}
