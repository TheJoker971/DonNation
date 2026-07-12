import { IsNotEmpty, IsString, Matches } from 'class-validator';

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export class LinkWalletDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ETH_ADDRESS, { message: 'Invalid Ethereum address' })
  address: string;
}
