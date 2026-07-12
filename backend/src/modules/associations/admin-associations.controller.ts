import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AssociationsService } from './associations.service';
import { ListAssociationsQueryDto } from './dto/list-associations-query.dto';
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

  @Get()
  list(@Query() query: ListAssociationsQueryDto) {
    return this.associationsService.findAllForAdmin(query.status);
  }

  @Patch(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.associationsService.approve(id, admin.sub);
  }

  @Patch(':id/suspend')
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.associationsService.suspend(id, admin.sub);
  }
}
