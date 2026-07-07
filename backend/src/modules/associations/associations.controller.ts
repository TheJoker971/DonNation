import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { AssociationsService } from './associations.service';
import { ReceiptService } from '../documents/receipt.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('associations')
export class AssociationsController {
  constructor(
    private readonly associationsService: AssociationsService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Get()
  findPublic() {
    return this.associationsService.findPublicCatalog();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  me(@CurrentUser() user: JwtPayload) {
    return this.associationsService.findMine(user.sub);
  }

  @Get('me/donations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  receivedDonations(@CurrentUser() user: JwtPayload) {
    return this.associationsService.findReceivedDonations(user.sub);
  }

  @Get('me/donations/:id/receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  async donationReceipt(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const pdfUrl = await this.receiptService.ensureReceiptForAssociation(user.sub, id);
    return { pdfUrl };
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.mimetype)) {
      throw new BadRequestException('Logo must be JPG, PNG or WebP');
    }

    return this.associationsService.updateLogo(user.sub, file);
  }

  @Post('me/stripe/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  startStripeOnboarding(@CurrentUser() user: JwtPayload) {
    return this.associationsService.startStripeOnboarding(user.sub);
  }
}
