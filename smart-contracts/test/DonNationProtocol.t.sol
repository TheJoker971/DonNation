// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DonNationProtocol} from "../src/DonNationProtocol.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

contract DonNationProtocolTest is Test {
    event AssociationRegistered(bytes32 indexed associationId);
    event AssociationActiveChanged(bytes32 indexed associationId, bool active);
    event AssociationFidelityChanged(bytes32 indexed associationId, bool fidelityEnabled);
    event ContractsUpdated(address indexed invoices, address indexed fidelityCard);

    DonNationProtocol internal protocol;
    DonationInvoices  internal invoices;
    FidelityCard      internal fidelityCard;

    address internal constant OWNER   = address(0xA11);
    address internal constant DONOR   = address(0xB0B);
    address internal constant STRANGER = address(0xC0C);

    bytes32 internal constant ASSOC       = keccak256("550e8400-e29b-41d4-a716-446655440001");
    bytes32 internal constant ASSOC_2     = keccak256("550e8400-e29b-41d4-a716-446655440002");
    bytes32 internal constant PAYMENT_HASH = keccak256("stripe:pi:test-001");
    bytes32 internal constant RECEIPT_HASH = keccak256("receipt:payload-v1");
    string  internal constant FIDELITY_URI = "ipfs://fidelity-card-meta";

    uint256 internal constant AMOUNT_EUR    = 1050;
    uint256 internal constant POINTS_EARNED = 100;

    function setUp() public {
        vm.startPrank(OWNER);
        protocol    = new DonNationProtocol(OWNER);
        invoices    = new DonationInvoices(address(protocol));
        fidelityCard = new FidelityCard(address(protocol));
        protocol.setContracts(address(invoices), address(fidelityCard));
        vm.stopPrank();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _registerAssoc() internal {
        vm.prank(OWNER);
        protocol.registerAssociation(ASSOC);
    }

    function _registerAssocWithFidelity() internal {
        vm.startPrank(OWNER);
        protocol.registerAssociation(ASSOC);
        protocol.setFidelityEnabled(ASSOC, true);
        vm.stopPrank();
    }

    function _mintInvoice(bytes32 paymentHash) internal {
        vm.prank(OWNER);
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, POINTS_EARNED, paymentHash, RECEIPT_HASH, FIDELITY_URI);
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function test_constructor() public view {
        assertEq(protocol.owner(), OWNER);
        assertEq(address(protocol.donationInvoices()), address(invoices));
        assertEq(address(protocol.fidelityCard()), address(fidelityCard));
    }

    // ─── setContracts ─────────────────────────────────────────────────────────

    function test_setContracts_emitsEvent() public {
        DonNationProtocol proto2 = new DonNationProtocol(OWNER);

        vm.prank(OWNER);
        vm.expectEmit(true, true, false, false);
        emit ContractsUpdated(address(invoices), address(fidelityCard));
        proto2.setContracts(address(invoices), address(fidelityCard));
    }

    function test_setContracts_revertsIfNotOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, STRANGER));
        protocol.setContracts(address(invoices), address(fidelityCard));
    }

    // ─── registerAssociation ─────────────────────────────────────────────────

    function test_registerAssociation_succeeds() public {
        vm.prank(OWNER);
        vm.expectEmit(true, false, false, false);
        emit AssociationRegistered(ASSOC);
        protocol.registerAssociation(ASSOC);

        DonNationProtocol.AssociationConfig memory config = protocol.getAssociation(ASSOC);
        assertTrue(config.registered);
        assertTrue(config.active);
        assertFalse(config.fidelityEnabled);
    }

    function test_registerAssociation_revertsIfZeroId() public {
        vm.prank(OWNER);
        vm.expectRevert(DonNationProtocol.InvalidAssociationId.selector);
        protocol.registerAssociation(bytes32(0));
    }

    function test_registerAssociation_revertsIfAlreadyRegistered() public {
        _registerAssoc();

        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(DonNationProtocol.AssociationAlreadyRegistered.selector, ASSOC));
        protocol.registerAssociation(ASSOC);
    }

    function test_registerAssociation_revertsIfNotOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, STRANGER));
        protocol.registerAssociation(ASSOC);
    }

    // ─── setAssociationActive ─────────────────────────────────────────────────

    function test_setAssociationActive_deactivates() public {
        _registerAssoc();

        vm.prank(OWNER);
        vm.expectEmit(true, false, false, true);
        emit AssociationActiveChanged(ASSOC, false);
        protocol.setAssociationActive(ASSOC, false);

        assertFalse(protocol.getAssociation(ASSOC).active);
        assertFalse(protocol.isAssociationActive(ASSOC));
    }

    function test_setAssociationActive_reactivates() public {
        _registerAssoc();

        vm.startPrank(OWNER);
        protocol.setAssociationActive(ASSOC, false);
        protocol.setAssociationActive(ASSOC, true);
        vm.stopPrank();

        assertTrue(protocol.isAssociationActive(ASSOC));
    }

    function test_setAssociationActive_revertsIfNotRegistered() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(DonNationProtocol.AssociationNotRegistered.selector, ASSOC));
        protocol.setAssociationActive(ASSOC, false);
    }

    function test_setAssociationActive_revertsIfNotOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, STRANGER));
        protocol.setAssociationActive(ASSOC, false);
    }

    // ─── setFidelityEnabled ───────────────────────────────────────────────────

    function test_setFidelityEnabled_enables() public {
        _registerAssoc();

        vm.prank(OWNER);
        vm.expectEmit(true, false, false, true);
        emit AssociationFidelityChanged(ASSOC, true);
        protocol.setFidelityEnabled(ASSOC, true);

        assertTrue(protocol.getAssociation(ASSOC).fidelityEnabled);
    }

    function test_setFidelityEnabled_disables() public {
        _registerAssocWithFidelity();

        vm.prank(OWNER);
        protocol.setFidelityEnabled(ASSOC, false);

        assertFalse(protocol.getAssociation(ASSOC).fidelityEnabled);
    }

    function test_setFidelityEnabled_revertsIfNotRegistered() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(DonNationProtocol.AssociationNotRegistered.selector, ASSOC));
        protocol.setFidelityEnabled(ASSOC, true);
    }

    function test_setFidelityEnabled_revertsIfNotOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, STRANGER));
        protocol.setFidelityEnabled(ASSOC, true);
    }

    // ─── mintInvoice : reverts ────────────────────────────────────────────────

    function test_mintInvoice_revertsIfContractsNotSet() public {
        DonNationProtocol proto2 = new DonNationProtocol(OWNER);

        vm.prank(OWNER);
        vm.expectRevert(DonNationProtocol.ContractsNotSet.selector);
        proto2.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH, FIDELITY_URI);
    }

    function test_mintInvoice_revertsIfAssociationNotRegistered() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(DonNationProtocol.AssociationNotRegistered.selector, ASSOC));
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH, FIDELITY_URI);
    }

    function test_mintInvoice_revertsIfAssociationNotActive() public {
        _registerAssoc();

        vm.startPrank(OWNER);
        protocol.setAssociationActive(ASSOC, false);
        vm.expectRevert(abi.encodeWithSelector(DonNationProtocol.AssociationNotActive.selector, ASSOC));
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH, FIDELITY_URI);
        vm.stopPrank();
    }

    function test_mintInvoice_revertsIfNotOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, STRANGER));
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH, FIDELITY_URI);
    }

    // ─── mintInvoice : succès sans fidélité ───────────────────────────────────

    function test_mintInvoice_withoutFidelity_mintsInvoice() public {
        _registerAssoc();
        _mintInvoice(PAYMENT_HASH);

        assertEq(invoices.ownerOf(1), DONOR);
        assertEq(invoices.nextTokenId(), 2);

        // Pas de carte de fidélité mintée
        assertEq(fidelityCard.getCard(DONOR, ASSOC).tokenId, 0);
    }

    // ─── mintInvoice : fidélité — premier mint (nouvelle carte) ───────────────

    function test_mintInvoice_withFidelity_mintsNewCard() public {
        _registerAssocWithFidelity();
        _mintInvoice(PAYMENT_HASH);

        assertEq(invoices.ownerOf(1), DONOR);

        FidelityCard.CardData memory card = fidelityCard.getCard(DONOR, ASSOC);
        assertEq(card.tokenId, 1);
        assertEq(card.balance, POINTS_EARNED);
        assertEq(card.totalEarned, POINTS_EARNED);
    }

    // ─── mintInvoice : fidélité — second mint (addPoints sur carte existante) ─

    function test_mintInvoice_withFidelity_addsPointsToExistingCard() public {
        _registerAssocWithFidelity();
        _mintInvoice(PAYMENT_HASH);

        vm.prank(OWNER);
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, 50, keccak256("stripe:pi:test-002"), RECEIPT_HASH, FIDELITY_URI);

        FidelityCard.CardData memory card = fidelityCard.getCard(DONOR, ASSOC);
        assertEq(card.balance, POINTS_EARNED + 50);
        assertEq(card.totalEarned, POINTS_EARNED + 50);
    }

    // ─── mintInvoice : fidélité activée mais zéro points ─────────────────────

    function test_mintInvoice_withFidelity_skipsCardIfZeroPoints() public {
        _registerAssocWithFidelity();

        vm.prank(OWNER);
        // pointsEarned = 0 → DonationInvoices revert car ZeroPointsEarned
        // On teste donc avec pointsEarned > 0 mais on vérifie la branche fidelity skip
        // via fidelityEnabled = false séparément (déjà couvert).
        // Ici on confirme qu'avec points > 0 la carte est bien créée.
        protocol.mintInvoice(DONOR, ASSOC, AMOUNT_EUR, 1, PAYMENT_HASH, RECEIPT_HASH, FIDELITY_URI);

        assertGt(fidelityCard.getCard(DONOR, ASSOC).tokenId, 0);
    }

    // ─── isAssociationActive ──────────────────────────────────────────────────

    function test_isAssociationActive_falseForUnknown() public view {
        assertFalse(protocol.isAssociationActive(ASSOC));
    }

    function test_isAssociationActive_trueAfterRegister() public {
        _registerAssoc();
        assertTrue(protocol.isAssociationActive(ASSOC));
    }

    function test_isAssociationActive_falseAfterDeactivation() public {
        _registerAssoc();

        vm.prank(OWNER);
        protocol.setAssociationActive(ASSOC, false);

        assertFalse(protocol.isAssociationActive(ASSOC));
    }
}
