import { AssociationStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListAssociationsQueryDto {
  @IsOptional()
  @IsEnum(AssociationStatus)
  status?: AssociationStatus;
}
