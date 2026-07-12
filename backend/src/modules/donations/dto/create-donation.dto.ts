import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateDonationDto {
  @IsUUID()
  associationId: string;

  /** Montant en centimes d'euro (ex: 5000 = 50,00 €). */
  @IsInt()
  @Min(100)
  amountEur: number;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
