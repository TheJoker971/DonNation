import { Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AssociationsService } from './associations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('admin/associations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: JwtPayload) {
    return this.associationsService.approve(id, admin.sub);
  }

  @Patch(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: JwtPayload) {
    return this.associationsService.suspend(id, admin.sub);
  }
}
