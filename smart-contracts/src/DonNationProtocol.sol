// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DonationInvoices} from "./DonationInvoices.sol";
import {FidelityCard} from "./FidelityCard.sol";

/// @title DonNationProtocol
/// @notice Point d'entrée central du protocole — registre des associations et orchestrateur.
/// @dev Owner de DonationInvoices et FidelityCard.
///      Flux : registerAssociation → mintInvoice (gère automatiquement la carte de fidélité).
contract DonNationProtocol is Ownable {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct AssociationConfig {
        bool registered; // existe dans le registre
        bool active; // peut recevoir des donations
        bool fidelityEnabled; // carte de fidélité activée pour cette association
        string invoicesUri;
    }

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidAssociationId();
    error AssociationAlreadyRegistered(bytes32 associationId);
    error AssociationNotRegistered(bytes32 associationId);
    error AssociationNotActive(bytes32 associationId);
    error AssociationFidelityDisabled(bytes32 associationId);
    error ContractsNotSet();

    // ─── Events ───────────────────────────────────────────────────────────────

    event AssociationRegistered(bytes32 indexed associationId);
    event AssociationActiveChanged(bytes32 indexed associationId, bool active);
    event AssociationFidelityChanged(bytes32 indexed associationId, bool fidelityEnabled);
    event ContractsUpdated(address indexed invoices, address indexed fidelityCard);
    event InvoicesUriChanged(bytes32 indexed associationId, string uri);

    // ─── Storage ──────────────────────────────────────────────────────────────

    mapping(bytes32 associationId => AssociationConfig) private _registeredAssociations;

    DonationInvoices public donationInvoices;
    FidelityCard public fidelityCard;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Setup ────────────────────────────────────────────────────────────────

    /// @notice Lie les contrats enfants au Protocol après leur déploiement.
    /// @dev Ordre de déploiement : Protocol → Invoices(protocol) → FidelityCard(protocol) → setContracts.
    function setContracts(address invoicesAddress, address fidelityCardAddress) external onlyOwner {
        donationInvoices = DonationInvoices(invoicesAddress);
        fidelityCard = FidelityCard(fidelityCardAddress);
        emit ContractsUpdated(invoicesAddress, fidelityCardAddress);
    }

    // ─── Association management ───────────────────────────────────────────────

    /// @notice Enregistre une nouvelle association. Active par défaut, fidélité désactivée.
    function registerAssociation(bytes32 associationId) external onlyOwner {
        if (associationId == bytes32(0)) revert InvalidAssociationId();
        if (_registeredAssociations[associationId].registered) revert AssociationAlreadyRegistered(associationId);

        _registeredAssociations[associationId] =
            AssociationConfig({registered: true, active: true, fidelityEnabled: false, invoicesUri: ""});

        emit AssociationRegistered(associationId);
    }

    /// @notice Active ou désactive une association.
    function setAssociationActive(bytes32 associationId) external onlyOwner {
        if (!_registeredAssociations[associationId].registered) revert AssociationNotRegistered(associationId);
        bool active = _registeredAssociations[associationId].active;
        _registeredAssociations[associationId].active = !active;
        emit AssociationActiveChanged(associationId, !active);
    }

    /// @notice Active ou désactive la carte de fidélité pour une association.
    function setFidelityEnabled(bytes32 associationId) external onlyOwner {
        if (!_registeredAssociations[associationId].registered) revert AssociationNotRegistered(associationId);
        bool enabled = _registeredAssociations[associationId].fidelityEnabled;
        _registeredAssociations[associationId].fidelityEnabled = !enabled;
        emit AssociationFidelityChanged(associationId, !enabled);
    }

    function setInvoicesUri(bytes32 associationId, string calldata uri) external onlyOwner {
        if (!_registeredAssociations[associationId].registered) revert AssociationNotRegistered(associationId);
        _registeredAssociations[associationId].invoicesUri = uri;
        emit InvoicesUriChanged(associationId, uri);
    }

    // ─── Protocol actions ─────────────────────────────────────────────────────

    /// @notice Mint un reçu de donation et, si la fidélité est activée, crédite la carte.
    /// @param fidelityCardUri URI du metadata si une nouvelle carte de fidélité doit être mintée.
    ///        Ignoré si le donateur a déjà une carte pour cette association.
    function mintInvoice(
        address to,
        bytes32 associationId,
        uint256 amountEur,
        uint256 pointsEarned,
        bytes32 externalPaymentIdHash,
        bytes32 receiptHash,
        string calldata fidelityCardUri
    ) external onlyOwner {
        if (address(donationInvoices) == address(0)) revert ContractsNotSet();

        AssociationConfig memory config = _registeredAssociations[associationId];
        if (!config.registered) revert AssociationNotRegistered(associationId);
        if (!config.active) revert AssociationNotActive(associationId);

        donationInvoices.mint(to, associationId, amountEur, pointsEarned, externalPaymentIdHash, receiptHash);

        if (config.fidelityEnabled) {
            _creditFidelityCard(to, associationId, pointsEarned, fidelityCardUri);
        }
    }

    /// @notice Crédite la carte de fidélité d'un utilisateur : mint si inexistante, ajout de points sinon.
    /// @dev `uri` est utilisé uniquement lors du premier mint ; ignoré si la carte existe déjà.
    function _creditFidelityCard(address to, bytes32 associationId, uint256 points, string calldata uri) internal {
        if (address(fidelityCard) == address(0)) revert ContractsNotSet();
        fidelityCard.mint(to, associationId, points, uri);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /// @notice Retourne la configuration complète d'une association.
    function getAssociation(bytes32 associationId) external view returns (AssociationConfig memory) {
        return _registeredAssociations[associationId];
    }

    /// @notice Retourne true si l'association est enregistrée et active.
    function isAssociationActive(bytes32 associationId) external view returns (bool) {
        AssociationConfig memory config = _registeredAssociations[associationId];
        return config.registered && config.active;
    }

    /// @notice Retourne la liste des adresses ayant une carte de fidélité pour une association.
    function getAssociationCardHolders(bytes32 associationId) external view returns (address[] memory) {
        if (address(fidelityCard) == address(0)) revert ContractsNotSet();
        return fidelityCard.getAssociationCardHolders(associationId);
    }
}
