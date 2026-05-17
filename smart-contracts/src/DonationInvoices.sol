// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


/// @title DonationInvoices
/// @notice Registre on-chain des reçus de donation (V1) — une invoice = un NFT ERC-721.
/// @dev Montants: amount = USDC (6 décimales), amountEur = centimes (0 si absent).
///      Identité donateur XOR: donorWallet OU donorIdentityHash (jamais les deux).
contract DonationInvoices is ERC721, ERC721URIStorage, Ownable {
    struct Invoice {
        uint256 associationId;
        uint256 amountEur;
        uint256 pointsEarned;
        bytes32 externalPaymentIdHash;
        bytes32 receiptHash;
        uint256 createdAt;
    }

    error PaymentAlreadyRegistered(bytes32 paymentHash);
    error AssociationNotActive(uint256 associationId);
    error InvalidDonorIdentity();
    error ZeroAmount();
    error NOT_TRANSFERABLE();
    error InvalidReceiptHash();
    error InvalidCreatedAt();
    error ZeroPointsEarned();

    event InvoiceMinted(address indexed invoiceOwner,uint256 indexed tokenId, uint256 indexed associationId, uint256 amountEur);


    uint256 private _nextTokenId = 1;

    mapping(uint256 => Invoice) private _invoices;
    mapping(bytes32 => bool) private _usedPaymentHashes;


    event FidelityCardUpdated(address indexed previousCard, address indexed newCard);

    constructor(address protocolAddress) ERC721("DonNation Donation Receipt", "DDR") Ownable(protocolAddress) {}
    
    function mint(address to, uint256 associationId, uint256 amountEur, uint256 pointsEarned, bytes32 externalPaymentIdHash, bytes32 receiptHash) external onlyOwner {
        if (isPaymentHashUsed(externalPaymentIdHash)) {
            revert PaymentAlreadyRegistered(externalPaymentIdHash);
        }
        if (associationId == 0) {
            revert AssociationNotActive(associationId);
        }
        if (amountEur == 0) {
            revert ZeroAmount();
        }
        if (pointsEarned == 0) {
            revert ZeroPointsEarned();
        }
        if (receiptHash == bytes32(0)) {
            revert InvalidReceiptHash();
        }
        uint256 createdAt = block.timestamp;
        _mint(to, _nextTokenId);    
        _invoices[_nextTokenId] = Invoice(associationId, amountEur, pointsEarned, externalPaymentIdHash, receiptHash, createdAt);
        _usedPaymentHashes[externalPaymentIdHash] = true;
        emit InvoiceMinted(to, _nextTokenId, associationId, amountEur);
        _nextTokenId++;
    }


    function _update(address to, uint256 tokenId, address from) internal override(ERC721) returns (address) {
        if (from != address(0)) {
            revert NOT_TRANSFERABLE();
        }
        return super._update(to, tokenId, from);
    }

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        _requireOwned(tokenId);
        return _invoices[tokenId];
    }

    function isPaymentHashUsed(bytes32 externalPaymentIdHash) internal view returns (bool) {
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
