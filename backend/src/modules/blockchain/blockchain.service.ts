import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, Interface, JsonRpcProvider, Wallet } from 'ethers';
import {
  DONATION_INVOICES_ABI,
  DON_NATION_PROTOCOL_ABI,
} from './abis/donnation-protocol.abi';
import { associationUuidToBytes32 } from './utils/association-id.util';

type AssociationOnChainConfig = {
  registered: boolean;
  active: boolean;
  fidelityEnabled: boolean;
  invoicesUri: string;
};

type TxReceipt = {
  hash: string;
  logs: Array<{ address: string; topics: string[]; data: string }>;
};

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly enabled: boolean;
  private readonly chainId: number;
  private readonly provider: JsonRpcProvider | null;
  private readonly wallet: Wallet | null;
  private readonly protocol: Contract | null;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.get<string>('BASE_SEPOLIA_RPC_URL');
    const privateKey = this.config.get<string>('BLOCKCHAIN_PRIVATE_KEY');
    const protocolAddress = this.config.get<string>(
      'DON_NATION_PROTOCOL_ADDRESS',
    );

    this.chainId = Number(this.config.get<string>('CHAIN_ID', '84532'));
    this.enabled = Boolean(rpcUrl && privateKey && protocolAddress);

    if (!this.enabled) {
      this.provider = null;
      this.wallet = null;
      this.protocol = null;
      this.logger.warn(
        'Blockchain not configured — on-chain actions are skipped',
      );
      return;
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey!, this.provider);
    this.protocol = new Contract(
      protocolAddress!,
      DON_NATION_PROTOCOL_ABI,
      this.wallet,
    );
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getChainId(): number {
    return this.chainId;
  }

  async getAssociationConfig(
    associationId: string,
  ): Promise<AssociationOnChainConfig | null> {
    if (!this.protocol) {
      return null;
    }

    const bytes32Id = associationUuidToBytes32(associationId);
    const config = (await this.protocol.getAssociation(
      bytes32Id,
    )) as AssociationOnChainConfig;
    return config;
  }

  async registerAssociation(associationId: string): Promise<string> {
    const protocol = this.requireProtocol();
    const bytes32Id = associationUuidToBytes32(associationId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await protocol.registerAssociation(bytes32Id);

    const receipt = await (tx as { wait: () => Promise<TxReceipt> }).wait();
    this.logger.log(
      `Association ${associationId} registered on-chain: ${receipt.hash}`,
    );
    return receipt.hash;
  }

  async ensureAssociationActive(associationId: string): Promise<void> {
    const protocol = this.requireProtocol();
    const bytes32Id = associationUuidToBytes32(associationId);
    const config = (await protocol.getAssociation(
      bytes32Id,
    )) as AssociationOnChainConfig;

    if (!config.registered) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tx = await protocol.registerAssociation(bytes32Id);

      await (tx as { wait: () => Promise<unknown> }).wait();
      this.logger.log(`Association ${associationId} registered on-chain`);
      return;
    }

    if (!config.active) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tx = await protocol.setAssociationActive(bytes32Id);

      await (tx as { wait: () => Promise<unknown> }).wait();
      this.logger.log(`Association ${associationId} activated on-chain`);
    }
  }

  async deactivateAssociation(associationId: string): Promise<void> {
    const protocol = this.requireProtocol();
    const bytes32Id = associationUuidToBytes32(associationId);
    const config = (await protocol.getAssociation(
      bytes32Id,
    )) as AssociationOnChainConfig;

    if (config.registered && config.active) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tx = await protocol.setAssociationActive(bytes32Id);

      await (tx as { wait: () => Promise<unknown> }).wait();
      this.logger.log(`Association ${associationId} deactivated on-chain`);
    }
  }

  async mintInvoice(params: {
    associationId: string;
    to: string;
    amountEur: number;
    pointsEarned: number;
    externalPaymentIdHash: string;
    receiptHash: string;
  }): Promise<{ txHash: string; tokenId: number }> {
    const protocol = this.requireProtocol();
    const bytes32AssociationId = associationUuidToBytes32(params.associationId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await protocol.mintInvoice(
      params.to,
      bytes32AssociationId,
      params.amountEur,
      params.pointsEarned,
      params.externalPaymentIdHash,
      params.receiptHash,
      '',
    );

    const receipt = await (tx as { wait: () => Promise<TxReceipt> }).wait();
    const invoicesAddress = (await protocol.donationInvoices()) as string;
    const tokenId = this.parseInvoiceMintedTokenId(receipt, invoicesAddress);

    if (tokenId === null) {
      throw new Error('InvoiceMinted event not found in transaction receipt');
    }

    return { txHash: receipt.hash, tokenId };
  }

  private parseInvoiceMintedTokenId(
    receipt: {
      logs: Array<{ address: string; topics: string[]; data: string }>;
    },
    invoicesAddress: string,
  ): number | null {
    const iface = new Interface(DONATION_INVOICES_ABI);
    const target = invoicesAddress.toLowerCase();

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== target) {
        continue;
      }

      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'InvoiceMinted') {
          return Number(parsed.args.tokenId);
        }
      } catch {
        // not an InvoiceMinted log
      }
    }

    return null;
  }

  private requireProtocol(): Contract {
    if (!this.protocol) {
      throw new Error('Blockchain is not configured');
    }
    return this.protocol;
  }
}
