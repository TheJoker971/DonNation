// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DonationInvoices
/// @notice Registre on-chain des reçus de donation — une invoice = un NFT ERC-721 soulbound.
/// @dev Owner = DonNationProtocol, qui valide l'association avant d'appeler mint().
///      associationId est un bytes32 représentant un UUID.
contract DonationInvoices is ERC721, ERC721URIStorage, Ownable {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct Invoice {
        bytes32 associationId;
        uint256 amountEur;
        uint256 pointsEarned;
        bytes32 externalPaymentIdHash;
        bytes32 receiptHash;
        uint256 createdAt;
    }

    // ─── Errors ───────────────────────────────────────────────────────────────

    error PaymentAlreadyRegistered(bytes32 paymentHash);
    error InvalidAssociationId();
    error ZeroAmount();
    error ZeroPointsEarned();
    error InvalidReceiptHash();
    error NOT_TRANSFERABLE();

    // ─── Events ───────────────────────────────────────────────────────────────

    event InvoiceMinted(
        address indexed invoiceOwner, uint256 indexed tokenId, bytes32 indexed associationId, uint256 amountEur
    );

    // ─── Storage ──────────────────────────────────────────────────────────────

    uint256 private _nextTokenId = 1;

    mapping(uint256 => Invoice) private _invoices;
    mapping(bytes32 => bool) private _usedPaymentHashes;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address protocolAddress) ERC721("DonNation Donation Receipt", "DDR") Ownable(protocolAddress) {}

    // ─── Soulbound ────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address from) internal override(ERC721) returns (address) {
        if (from != address(0)) revert NOT_TRANSFERABLE();
        return super._update(to, tokenId, from);
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Mint un reçu de donation. Appelé uniquement par DonNationProtocol (owner).
    function mint(
        address to,
        bytes32 associationId,
        uint256 amountEur,
        uint256 pointsEarned,
        bytes32 externalPaymentIdHash,
        bytes32 receiptHash
    ) external onlyOwner {
        if (_usedPaymentHashes[externalPaymentIdHash]) {
            revert PaymentAlreadyRegistered(externalPaymentIdHash);
        }
        if (associationId == bytes32(0)) revert InvalidAssociationId();
        if (amountEur == 0) revert ZeroAmount();
        if (pointsEarned == 0) revert ZeroPointsEarned();
        if (receiptHash == bytes32(0)) revert InvalidReceiptHash();

        uint256 tokenId = _nextTokenId;
        _mint(to, tokenId);
        _invoices[tokenId] =
            Invoice(associationId, amountEur, pointsEarned, externalPaymentIdHash, receiptHash, block.timestamp);
        _usedPaymentHashes[externalPaymentIdHash] = true;

        emit InvoiceMinted(to, tokenId, associationId, amountEur);
        _nextTokenId++;
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        _requireOwned(tokenId);
        return _invoices[tokenId];
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
