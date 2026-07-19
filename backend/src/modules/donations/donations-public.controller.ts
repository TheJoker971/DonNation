import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DonationsService } from './donations.service';

/**
 * Endpoints publics (sans authentification) pour les dons.
 * Utilisé principalement par les wallets / viewers NFT (MetaMask, OpenSea…)
 * pour résoudre le tokenURI ERC-721.
 */
@Controller('donations')
export class DonationsPublicController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get(':id/nft-metadata')
  getNftMetadata(@Param('id', ParseUUIDPipe) id: string) {
    return this.donationsService.getNftMetadata(id);
  }
}
