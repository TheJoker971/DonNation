import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AssociationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAssociationDto } from './dto/register-association.dto';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { StripeService } from '../payments/stripe.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class AssociationsService {
  private readonly logger = new Logger(AssociationsService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly stripeService: StripeService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async register(dto: RegisterAssociationDto) {
    const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const slugTaken = await this.prisma.association.findUnique({ where: { slug: dto.slug } });
    if (slugTaken) {
      throw new ConflictException('Association slug already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.ASSOCIATION,
          displayName: dto.name,
        },
      });

      const association = await tx.association.create({
        data: {
          ownerId: user.id,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: AssociationStatus.PENDING,
        },
      });

      return { user, association };
    });

    const payload: JwtPayload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.toPublicUser(result.user),
      association: this.toPublicAssociation(result.association),
    };
  }

  async startStripeOnboarding(ownerId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
      include: { owner: true },
    });

    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    let stripeConnectAccountId = association.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
      stripeConnectAccountId = await this.stripeService.createConnectAccount(
        association.id,
        association.owner.email,
      );

      await this.prisma.association.update({
        where: { id: association.id },
        data: { stripeConnectAccountId },
      });
    }

    return this.stripeService.createAccountLink(stripeConnectAccountId, association.id);
  }

  async findMine(ownerId: string) {
    const association = await this.prisma.association.findUnique({
      where: { ownerId },
      include: { owner: true },
    });

    if (!association) {
      throw new NotFoundException('Association not found for this account');
    }

    return {
      ...this.toPublicAssociation(association),
      owner: this.toPublicUser(association.owner),
    };
  }

  async approve(associationId: string, adminId: string) {
    return this.updateStatus(associationId, adminId, AssociationStatus.APPROVED);
  }

  async suspend(associationId: string, adminId: string) {
    return this.updateStatus(associationId, adminId, AssociationStatus.SUSPENDED);
  }

  private async updateStatus(
    associationId: string,
    adminId: string,
    status: AssociationStatus,
  ) {
    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
    });

    if (!association) {
      throw new NotFoundException('Association not found');
    }

    if (status === AssociationStatus.APPROVED && association.status === AssociationStatus.APPROVED) {
      throw new ConflictException('Association is already approved');
    }

    if (status === AssociationStatus.SUSPENDED && association.status === AssociationStatus.SUSPENDED) {
      throw new ConflictException('Association is already suspended');
    }

    const updated = await this.prisma.association.update({
      where: { id: associationId },
      data: {
        status,
        approvedAt: status === AssociationStatus.APPROVED ? new Date() : association.approvedAt,
        approvedById: status === AssociationStatus.APPROVED ? adminId : association.approvedById,
      },
    });

    await this.syncAssociationOnChain(associationId, status);

    return this.toPublicAssociation(updated);
  }

  private async syncAssociationOnChain(associationId: string, status: AssociationStatus) {
    if (!this.blockchainService.isEnabled()) {
      return;
    }

    try {
      if (status === AssociationStatus.APPROVED) {
        await this.blockchainService.ensureAssociationActive(associationId);
        await this.prisma.association.update({
          where: { id: associationId },
          data: { onChainRegistered: true },
        });
      }

      if (status === AssociationStatus.SUSPENDED) {
        await this.blockchainService.deactivateAssociation(associationId);
      }
    } catch (error) {
      this.logger.error(`On-chain sync failed for association ${associationId}`, error);
    }
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: Role;
    displayName: string | null;
    walletAddress: string | null;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    };
  }

  private toPublicAssociation(association: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    status: AssociationStatus;
    stripeConnectAccountId: string | null;
    stripeOnboardingComplete: boolean;
    onChainRegistered: boolean;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: association.id,
      name: association.name,
      slug: association.slug,
      description: association.description,
      logoUrl: association.logoUrl,
      status: association.status,
      stripeConnectAccountId: association.stripeConnectAccountId,
      stripeOnboardingComplete: association.stripeOnboardingComplete,
      onChainRegistered: association.onChainRegistered,
      approvedAt: association.approvedAt,
      createdAt: association.createdAt,
      updatedAt: association.updatedAt,
    };
  }
}
