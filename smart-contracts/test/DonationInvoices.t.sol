// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";

contract DonationInvoicesTest is Test {
    event InvoiceMinted(
        address indexed invoiceOwner,
        uint256 indexed tokenId,
        uint256 indexed associationId,
        uint256 amountEur
    );

    DonationInvoices internal invoices;

    address internal owner = makeAddr("owner");
    address internal donor = makeAddr("donor");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ASSOCIATION_ID = 42;
    uint256 internal constant AMOUNT_EUR = 1050;
    uint256 internal constant POINTS_EARNED = 100;
    bytes32 internal constant PAYMENT_HASH = keccak256("stripe:pi:test-001");
    bytes32 internal constant RECEIPT_HASH = keccak256("receipt:payload-v1");

    function setUp() public {
        invoices = new DonationInvoices(owner);
    }

    function _mint() internal returns (uint256 tokenId) {
        vm.prank(owner);
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);
        tokenId = invoices.nextTokenId() - 1;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    function test_constructor_setsOwnerAndMetadata() public view {
        assertEq(invoices.owner(), owner);
        assertEq(invoices.name(), "DonNation Donation Receipt");
        assertEq(invoices.symbol(), "DDR");
        assertEq(invoices.nextTokenId(), 1);
    }

    // ─── mint: succès ─────────────────────────────────────────────────────────

    function test_mint_succeeds() public {
        vm.expectEmit(true, true, true, true);
        emit InvoiceMinted(donor, 1, ASSOCIATION_ID, AMOUNT_EUR);

        vm.prank(owner);
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);

        assertEq(invoices.ownerOf(1), donor);
        assertEq(invoices.nextTokenId(), 2);

        DonationInvoices.Invoice memory inv = invoices.getInvoice(1);
        assertEq(inv.associationId, ASSOCIATION_ID);
        assertEq(inv.amountEur, AMOUNT_EUR);
        assertEq(inv.pointsEarned, POINTS_EARNED);
        assertEq(inv.externalPaymentIdHash, PAYMENT_HASH);
        assertEq(inv.receiptHash, RECEIPT_HASH);
        assertEq(inv.createdAt, block.timestamp);
    }

    function test_mint_incrementsTokenId() public {
        _mint();

        vm.prank(owner);
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, keccak256("stripe:pi:test-002"), RECEIPT_HASH);

        assertEq(invoices.nextTokenId(), 3);
        assertEq(invoices.ownerOf(2), donor);
    }

    // ─── mint: reverts ────────────────────────────────────────────────────────

    function test_mint_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);
    }

    function test_mint_revertsIfPaymentHashAlreadyUsed() public {
        _mint();

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(DonationInvoices.PaymentAlreadyRegistered.selector, PAYMENT_HASH));
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);
    }

    function test_mint_revertsIfAssociationIdZero() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(DonationInvoices.AssociationNotActive.selector, uint256(0)));
        invoices.mint(donor, 0, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);
    }

    function test_mint_revertsIfZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.ZeroAmount.selector);
        invoices.mint(donor, ASSOCIATION_ID, 0, POINTS_EARNED, PAYMENT_HASH, RECEIPT_HASH);
    }

    function test_mint_revertsIfZeroPoints() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.ZeroPointsEarned.selector);
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, 0, PAYMENT_HASH, RECEIPT_HASH);
    }

    function test_mint_revertsIfInvalidReceiptHash() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.InvalidReceiptHash.selector);
        invoices.mint(donor, ASSOCIATION_ID, AMOUNT_EUR, POINTS_EARNED, PAYMENT_HASH, bytes32(0));
    }

    // ─── Transfert bloqué ─────────────────────────────────────────────────────

    function test_transfer_reverts() public {
        _mint();

        vm.prank(donor);
        vm.expectRevert(DonationInvoices.NOT_TRANSFERABLE.selector);
        invoices.transferFrom(donor, stranger, 1);
    }

    // ─── getInvoice ───────────────────────────────────────────────────────────

    function test_getInvoice_revertsForUnknownToken() public {
        vm.expectRevert();
        invoices.getInvoice(999);
    }

    // ─── tokenURI ─────────────────────────────────────────────────────────────

    function test_tokenURI_returnsEmptyWhenNoUriSet() public {
        _mint();
        assertEq(invoices.tokenURI(1), "");
    }

    // ─── supportsInterface ────────────────────────────────────────────────────

    function test_supportsInterface() public view {
        assertTrue(invoices.supportsInterface(0x01ffc9a7)); // IERC165
        assertTrue(invoices.supportsInterface(0x80ac58cd)); // IERC721
        assertTrue(invoices.supportsInterface(0x5b5e139f)); // IERC721Metadata
        assertFalse(invoices.supportsInterface(0xdeadbeef));
    }
}
