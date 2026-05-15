// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDonNationProtocol} from "./interfaces/IDonNationProtocol.sol";
import {IFidelityCard1155} from "./interfaces/IFidelityCard1155.sol";

/// @title DonationInvoices
/// @notice Registre on-chain des reçus de donation (V1) — une invoice = un NFT ERC-721.
/// @dev Montants: amount = USDC (6 décimales), amountEur = centimes (0 si absent).
///      Identité donateur XOR: donorWallet OU donorIdentityHash (jamais les deux).
contract DonationInvoices is ERC721, ERC721URIStorage, Ownable {
    struct Invoice {
        uint256 associationId;
        address donorWallet;
        bytes32 donorIdentityHash;
        uint256 amount;
        uint256 amountEur;
        uint256 pointsEarned;
        bytes32 externalPaymentIdHash;
        bytes32 receiptHash;
        uint64 createdAt;
    }

    error PaymentAlreadyRegistered(bytes32 paymentHash);
    error AssociationNotActive(uint256 associationId);
    error InvalidDonorIdentity();
    error ZeroAmount();

    IDonNationProtocol public immutable donNationProtocol;
    IFidelityCard1155 public fidelityCard;

    uint256 private _nextTokenId = 1;

    mapping(uint256 => Invoice) private _invoices;
    mapping(bytes32 => bool) private _usedPaymentHashes;

    event InvoiceMinted(
        uint256 indexed tokenId,
        uint256 indexed associationId,
        bytes32 indexed externalPaymentIdHash,
        address donorWallet,
        bytes32 donorIdentityHash,
        uint256 amount,
        uint256 amountEur,
        uint256 pointsEarned,
        bytes32 receiptHash,
        uint64 createdAt
    );

    event FidelityCardUpdated(address indexed previousCard, address indexed newCard);

    constructor(address protocolAddress) ERC721("DonNation Donation Receipt", "DNINV") Ownable(msg.sender) {
        donNationProtocol = IDonNationProtocol(protocolAddress);
    }

    /// @notice Enregistre une donation confirmée et mint le reçu NFT.
    /// @param to Destinataire du NFT (souvent le wallet du donateur).
    /// @param uri Metadata JSON off-chain (IPFS / HTTPS).
    struct MintParams {
        address to;
        uint256 associationId;
        address donorWallet;
        bytes32 donorIdentityHash;
        uint256 amount;
        uint256 amountEur;
        uint256 pointsEarned;
        bytes32 externalPaymentIdHash;
        bytes32 receiptHash;
        string uri;
    }

    function mintInvoice(
        address to,
        uint256 associationId,
        address donorWallet,
        bytes32 donorIdentityHash,
        uint256 amount,
        uint256 amountEur,
        uint256 pointsEarned,
        bytes32 externalPaymentIdHash,
        bytes32 receiptHash,
        string calldata uri
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _mintInvoice(
            MintParams({
                to: to,
                associationId: associationId,
                donorWallet: donorWallet,
                donorIdentityHash: donorIdentityHash,
                amount: amount,
                amountEur: amountEur,
                pointsEarned: pointsEarned,
                externalPaymentIdHash: externalPaymentIdHash,
                receiptHash: receiptHash,
                uri: uri
            })
        );
    }

    function _mintInvoice(MintParams memory p) private returns (uint256 tokenId) {
        bool hasWallet = p.donorWallet != address(0);
        bool hasIdentityHash = p.donorIdentityHash != bytes32(0);
        if (hasWallet == hasIdentityHash) revert InvalidDonorIdentity();
        if (p.amount == 0) revert ZeroAmount();
        if (!donNationProtocol.isAssociationActive(p.associationId)) {
            revert AssociationNotActive(p.associationId);
        }
        if (_usedPaymentHashes[p.externalPaymentIdHash]) {
            revert PaymentAlreadyRegistered(p.externalPaymentIdHash);
        }

        tokenId = _nextTokenId++;
        _usedPaymentHashes[p.externalPaymentIdHash] = true;

        _mint(p.to, tokenId);
        _setTokenURI(tokenId, p.uri);

        uint64 createdAt = uint64(block.timestamp);
        _invoices[tokenId] = Invoice({
            associationId: p.associationId,
            donorWallet: p.donorWallet,
            donorIdentityHash: p.donorIdentityHash,
            amount: p.amount,
            amountEur: p.amountEur,
            pointsEarned: p.pointsEarned,
            externalPaymentIdHash: p.externalPaymentIdHash,
            receiptHash: p.receiptHash,
            createdAt: createdAt
        });

        if (address(fidelityCard) != address(0) && p.pointsEarned > 0) {
            fidelityCard.grantPoints(p.to, p.pointsEarned, tokenId);
        }

        emit InvoiceMinted(
            tokenId,
            p.associationId,
            p.externalPaymentIdHash,
            p.donorWallet,
            p.donorIdentityHash,
            p.amount,
            p.amountEur,
            p.pointsEarned,
            p.receiptHash,
            createdAt
        );
    }

    function setFidelityCard(address cardAddress) external onlyOwner {
        address previous = address(fidelityCard);
        fidelityCard = IFidelityCard1155(cardAddress);
        emit FidelityCardUpdated(previous, cardAddress);
    }

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        _requireOwned(tokenId);
        return _invoices[tokenId];
    }

    function isPaymentHashUsed(bytes32 externalPaymentIdHash) external view returns (bool) {
        return _usedPaymentHashes[externalPaymentIdHash];
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
