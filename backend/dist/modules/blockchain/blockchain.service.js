"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const donnation_protocol_abi_1 = require("./abis/donnation-protocol.abi");
const association_id_util_1 = require("./utils/association-id.util");
let BlockchainService = BlockchainService_1 = class BlockchainService {
    config;
    logger = new common_1.Logger(BlockchainService_1.name);
    enabled;
    chainId;
    provider;
    wallet;
    protocol;
    constructor(config) {
        this.config = config;
        const rpcUrl = this.config.get('BASE_SEPOLIA_RPC_URL');
        const privateKey = this.config.get('BLOCKCHAIN_PRIVATE_KEY');
        const protocolAddress = this.config.get('DON_NATION_PROTOCOL_ADDRESS');
        this.chainId = Number(this.config.get('CHAIN_ID', '84532'));
        this.enabled = Boolean(rpcUrl && privateKey && protocolAddress);
        if (!this.enabled) {
            this.provider = null;
            this.wallet = null;
            this.protocol = null;
            this.logger.warn('Blockchain not configured — on-chain actions are skipped');
            return;
        }
        this.provider = new ethers_1.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers_1.Wallet(privateKey, this.provider);
        this.protocol = new ethers_1.Contract(protocolAddress, donnation_protocol_abi_1.DON_NATION_PROTOCOL_ABI, this.wallet);
    }
    isEnabled() {
        return this.enabled;
    }
    getChainId() {
        return this.chainId;
    }
    async getAssociationConfig(associationId) {
        if (!this.protocol) {
            return null;
        }
        const bytes32Id = (0, association_id_util_1.associationUuidToBytes32)(associationId);
        const config = (await this.protocol.getAssociation(bytes32Id));
        return config;
    }
    async registerAssociation(associationId) {
        const protocol = this.requireProtocol();
        const bytes32Id = (0, association_id_util_1.associationUuidToBytes32)(associationId);
        const tx = await protocol.registerAssociation(bytes32Id);
        const receipt = await tx.wait();
        this.logger.log(`Association ${associationId} registered on-chain: ${receipt.hash}`);
        return receipt.hash;
    }
    async ensureAssociationActive(associationId) {
        const protocol = this.requireProtocol();
        const bytes32Id = (0, association_id_util_1.associationUuidToBytes32)(associationId);
        const config = (await protocol.getAssociation(bytes32Id));
        if (!config.registered) {
            const tx = await protocol.registerAssociation(bytes32Id);
            await tx.wait();
            this.logger.log(`Association ${associationId} registered on-chain`);
            return;
        }
        if (!config.active) {
            const tx = await protocol.setAssociationActive(bytes32Id);
            await tx.wait();
            this.logger.log(`Association ${associationId} activated on-chain`);
        }
    }
    async deactivateAssociation(associationId) {
        const protocol = this.requireProtocol();
        const bytes32Id = (0, association_id_util_1.associationUuidToBytes32)(associationId);
        const config = (await protocol.getAssociation(bytes32Id));
        if (config.registered && config.active) {
            const tx = await protocol.setAssociationActive(bytes32Id);
            await tx.wait();
            this.logger.log(`Association ${associationId} deactivated on-chain`);
        }
    }
    async mintInvoice(params) {
        const protocol = this.requireProtocol();
        const bytes32AssociationId = (0, association_id_util_1.associationUuidToBytes32)(params.associationId);
        const tx = await protocol.mintInvoice(params.to, bytes32AssociationId, params.amountEur, params.pointsEarned, params.externalPaymentIdHash, params.receiptHash, '');
        const receipt = await tx.wait();
        const invoicesAddress = (await protocol.donationInvoices());
        const tokenId = this.parseInvoiceMintedTokenId(receipt, invoicesAddress);
        if (tokenId === null) {
            throw new Error('InvoiceMinted event not found in transaction receipt');
        }
        return { txHash: receipt.hash, tokenId };
    }
    parseInvoiceMintedTokenId(receipt, invoicesAddress) {
        const iface = new ethers_1.Interface(donnation_protocol_abi_1.DONATION_INVOICES_ABI);
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
            }
            catch {
            }
        }
        return null;
    }
    requireProtocol() {
        if (!this.protocol) {
            throw new Error('Blockchain is not configured');
        }
        return this.protocol;
    }
};
exports.BlockchainService = BlockchainService;
exports.BlockchainService = BlockchainService = BlockchainService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BlockchainService);
//# sourceMappingURL=blockchain.service.js.map