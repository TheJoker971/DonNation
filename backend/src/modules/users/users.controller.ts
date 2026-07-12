import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { LinkWalletDto } from './dto/link-wallet.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/wallet')
  linkWallet(@CurrentUser() user: JwtPayload, @Body() dto: LinkWalletDto) {
    return this.usersService
      .linkWalletAddress(user.sub, dto.address)
      .then((updated) => this.usersService.toPublic(updated));
  }
}
