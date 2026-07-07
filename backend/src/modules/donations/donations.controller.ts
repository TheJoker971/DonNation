import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DonationsService } from './donations.service';
import { ReceiptService } from '../documents/receipt.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDonationDto) {
    return this.donationsService.create(user.sub, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.donationsService.findMine(user.sub);
  }

  @Post(':id/pay')
  pay(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.createPaymentIntent(user.sub, id);
  }

  @Get(':id/receipt')
  async receipt(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const pdfUrl = await this.receiptService.ensureReceiptForDonor(user.sub, id);
    return { pdfUrl };
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.findOneForDonor(user.sub, id);
  }
}
