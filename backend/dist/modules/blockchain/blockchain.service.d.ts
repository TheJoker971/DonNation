import { ConfigService } from '@nestjs/config';
type AssociationOnChainConfig = {
    registered: boolean;
    active: boolean;
    fidelityEnabled: boolean;
    invoicesUri: string;
};
export declare class BlockchainService {
    private readonly config;
    private readonly logger;
    private readonly enabled;
    private readonly chainId;
    private readonly provider;
    private readonly wallet;
    private readonly protocol;
    constructor(config: ConfigService);
    isEnabled(): boolean;
    getChainId(): number;
    getAssociationConfig(associationId: string): Promise<AssociationOnChainConfig | null>;
    registerAssociation(associationId: string): Promise<string>;
    ensureAssociationActive(associationId: string): Promise<void>;
    deactivateAssociation(associationId: string): Promise<void>;
    mintInvoice(params: {
        associationId: string;
        to: string;
        amountEur: number;
        pointsEarned: number;
        externalPaymentIdHash: string;
        receiptHash: string;
    }): Promise<{
        txHash: string;
        tokenId: number;
    }>;
    private parseInvoiceMintedTokenId;
    private requireProtocol;
}
export {};
