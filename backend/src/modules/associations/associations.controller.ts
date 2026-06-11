import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AssociationsService } from './associations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('associations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Get('me')
  @Roles(Role.ASSOCIATION)
  me(@CurrentUser() user: JwtPayload) {
    return this.associationsService.findMine(user.sub);
  }

  @Post('me/stripe/onboard')
  @Roles(Role.ASSOCIATION)
  startStripeOnboarding(@CurrentUser() user: JwtPayload) {
    return this.associationsService.startStripeOnboarding(user.sub);
  }
}
