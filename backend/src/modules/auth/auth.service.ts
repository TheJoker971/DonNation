import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Wallet, verifyMessage } from 'ethers';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { encryptWalletPrivateKey } from '../../common/utils/wallet-crypto.util';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  private readonly googleClient: OAuth2Client | null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = clientId ? new OAuth2Client(clientId) : null;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.usersService.createDonorWithEmail({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async loginWithGoogle(idToken: string) {
    if (!this.googleClient) {
      throw new BadRequestException('Google authentication is not configured');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    let user = await this.usersService.findByGoogleId(payload.sub);
    if (!user) {
      const byEmail = await this.usersService.findByEmail(payload.email);
      if (byEmail && byEmail.role !== Role.DONOR) {
        throw new ConflictException('Email already used by a non-donor account');
      }
      if (byEmail) {
        user = await this.usersService.linkGoogleAccount(byEmail.id, payload.sub, payload.name);
      } else {
        user = await this.createGoogleDonor(payload.sub, payload.email, payload.name);
      }
    }

    if (user.role !== Role.DONOR) {
      throw new UnauthorizedException('Google login is only available for donors');
    }

    return this.buildAuthResponse(user);
  }

  async createWalletNonce(address: string) {
    const normalized = address.toLowerCase();
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.upsertWalletNonce(normalized, nonce, expiresAt);

    return {
      message: this.buildWalletSignMessage(normalized, nonce),
      expiresAt,
    };
  }

  async loginWithWallet(address: string, signature: string) {
    const normalized = address.toLowerCase();
    const donor = await this.usersService.findByWalletAddress(normalized);

    if (!donor?.walletAuthNonce || !donor.walletAuthNonceExpiresAt) {
      throw new UnauthorizedException('Wallet nonce not found — request a new one');
    }

    if (donor.walletAuthNonceExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Wallet nonce expired');
    }

    if (donor.role !== Role.DONOR) {
      throw new UnauthorizedException('Wallet login is only available for donors');
    }

    const message = this.buildWalletSignMessage(normalized, donor.walletAuthNonce);
    let recovered: string;
    try {
      recovered = verifyMessage(message, signature).toLowerCase();
    } catch {
      throw new UnauthorizedException('Invalid wallet signature');
    }

    if (recovered !== normalized) {
      throw new UnauthorizedException('Wallet signature mismatch');
    }

    await this.usersService.clearWalletNonce(donor.id);
    return this.buildAuthResponse(donor);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      user.passwordHash &&
      (user.role === Role.ASSOCIATION || user.role === Role.ADMIN)
    ) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
      await this.mailService.sendPasswordResetEmail(
        user.email,
        `${appUrl}/reset-password?token=${rawToken}`,
      );
    }

    return { message: 'If an eligible account exists, a reset email has been sent.' };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.role !== Role.ASSOCIATION && user.role !== Role.ADMIN) {
      throw new BadRequestException('Password reset not allowed for this account');
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    await this.usersService.updatePassword(user.id, passwordHash);

    return { message: 'Password updated successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.toPublic(user);
  }

  private async createGoogleDonor(googleId: string, email: string, name?: string | null) {
    const encryptionKey = this.config.get<string>('WALLET_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new BadRequestException('Wallet encryption is not configured');
    }

    const wallet = Wallet.createRandom();
    const walletPrivateKeyEncrypted = encryptWalletPrivateKey(wallet.privateKey, encryptionKey);

    return this.usersService.createDonorWithGoogle({
      email,
      googleId,
      displayName: name ?? undefined,
      walletAddress: wallet.address.toLowerCase(),
      walletPrivateKeyEncrypted,
    });
  }

  private buildWalletSignMessage(address: string, nonce: string): string {
    return `Connect your wallet to DonNation.\nAddress: ${address}\nNonce: ${nonce}`;
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.usersService.toPublic(user),
    };
  }
}
