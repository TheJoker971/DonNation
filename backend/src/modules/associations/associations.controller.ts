import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { AssociationsService } from './associations.service';
import { ReceiptService } from '../documents/receipt.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UpdateAssociationDto } from './dto/update-association.dto';

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

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  updateMine(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAssociationDto) {
    return this.associationsService.updateMine(user.sub, dto);
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

  @Post('me/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'photos', maxCount: 6 }], {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhotos(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: { photos?: Express.Multer.File[] },
    @Body('captions') captions?: string,
  ) {
    const photos = files?.photos;
    if (!photos?.length) throw new BadRequestException('At least one photo is required');

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    for (const f of photos) {
      if (!allowedMime.includes(f.mimetype)) {
        throw new BadRequestException('Photos must be JPG, PNG or WebP');
      }
    }

    const captionList: string[] = captions ? JSON.parse(captions) : [];
    return this.associationsService.addPhotos(user.sub, photos, captionList);
  }

  @Delete('me/photos/:photoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  deletePhoto(@CurrentUser() user: JwtPayload, @Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.associationsService.deletePhoto(user.sub, photoId);
  }

  @Post('me/stripe/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ASSOCIATION)
  startStripeOnboarding(@CurrentUser() user: JwtPayload) {
    return this.associationsService.startStripeOnboarding(user.sub);
  }

  @Get(':slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.associationsService.findPublicBySlug(slug);
  }
}
