// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";
import {MockDonNationProtocol} from "./mocks/MockDonNationProtocol.sol";
import {MockFidelityCard1155} from "./mocks/MockFidelityCard1155.sol";

contract DonationInvoicesTest is Test {
    event FidelityCardUpdated(address indexed previousCard, address indexed newCard);

    DonationInvoices internal invoices;
    MockDonNationProtocol internal protocol;
    MockFidelityCard1155 internal fidelityCard;

    address internal owner = makeAddr("owner");
    address internal donor = makeAddr("donor");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ASSOCIATION_ID = 42;
    bytes32 internal constant PAYMENT_HASH = keccak256("stripe:pi:test-001");
    bytes32 internal constant DONOR_IDENTITY_HASH = keccak256("donor:user-123");
    bytes32 internal constant RECEIPT_HASH = keccak256("receipt:payload-v1");
    string internal constant TOKEN_URI = "ipfs://donation-receipt-1";

    function setUp() public {
        vm.startPrank(owner);
        protocol = new MockDonNationProtocol();
        protocol.setAssociationActive(ASSOCIATION_ID, true);
        invoices = new DonationInvoices(address(protocol));
        fidelityCard = new MockFidelityCard1155();
        vm.stopPrank();
    }

    function _mintWithWallet() internal returns (uint256 tokenId) {
        vm.prank(owner);
        tokenId = invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 10_000_000, 1050, 100, PAYMENT_HASH, RECEIPT_HASH, TOKEN_URI
        );
    }

    function test_mintInvoice_withDonorWallet_succeeds() public {
        uint256 tokenId = _mintWithWallet();

        assertEq(tokenId, 1);
        assertEq(invoices.ownerOf(tokenId), donor);
        assertEq(invoices.tokenURI(tokenId), TOKEN_URI);
        assertTrue(invoices.isPaymentHashUsed(PAYMENT_HASH));
        assertEq(invoices.nextTokenId(), 2);

        DonationInvoices.Invoice memory invoice = invoices.getInvoice(tokenId);
        assertEq(invoice.associationId, ASSOCIATION_ID);
        assertEq(invoice.donorWallet, donor);
        assertEq(invoice.donorIdentityHash, bytes32(0));
        assertEq(invoice.amount, 10_000_000);
        assertEq(invoice.amountEur, 1050);
        assertEq(invoice.pointsEarned, 100);
        assertEq(invoice.externalPaymentIdHash, PAYMENT_HASH);
        assertEq(invoice.receiptHash, RECEIPT_HASH);
        assertEq(invoice.createdAt, uint64(block.timestamp));
    }

    function test_mintInvoice_withDonorIdentityHash_succeeds() public {
        bytes32 paymentHash = keccak256("stripe:pi:test-002");

        vm.prank(owner);
        uint256 tokenId = invoices.mintInvoice(
            donor,
            ASSOCIATION_ID,
            address(0),
            DONOR_IDENTITY_HASH,
            5_000_000,
            0,
            50,
            paymentHash,
            RECEIPT_HASH,
            TOKEN_URI
        );

        DonationInvoices.Invoice memory invoice = invoices.getInvoice(tokenId);
        assertEq(invoice.donorWallet, address(0));
        assertEq(invoice.donorIdentityHash, DONOR_IDENTITY_HASH);
    }

    function test_mintInvoice_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 10_000_000, 0, 0, PAYMENT_HASH, RECEIPT_HASH, TOKEN_URI
        );
    }

    function test_mintInvoice_revertsIfAssociationInactive() public {
        protocol.setAssociationActive(ASSOCIATION_ID, false);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(DonationInvoices.AssociationNotActive.selector, ASSOCIATION_ID));
        invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 10_000_000, 0, 0, PAYMENT_HASH, RECEIPT_HASH, TOKEN_URI
        );
    }

    function test_mintInvoice_revertsIfPaymentHashAlreadyUsed() public {
        _mintWithWallet();

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(DonationInvoices.PaymentAlreadyRegistered.selector, PAYMENT_HASH));
        invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 10_000_000, 0, 0, PAYMENT_HASH, RECEIPT_HASH, "ipfs://other"
        );
    }

    function test_mintInvoice_revertsIfBothDonorIdentifiersSet() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.InvalidDonorIdentity.selector);
        invoices.mintInvoice(
            donor,
            ASSOCIATION_ID,
            donor,
            DONOR_IDENTITY_HASH,
            10_000_000,
            0,
            0,
            keccak256("stripe:pi:test-003"),
            RECEIPT_HASH,
            TOKEN_URI
        );
    }

    function test_mintInvoice_revertsIfNoDonorIdentifier() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.InvalidDonorIdentity.selector);
        invoices.mintInvoice(
            donor,
            ASSOCIATION_ID,
            address(0),
            bytes32(0),
            10_000_000,
            0,
            0,
            keccak256("stripe:pi:test-004"),
            RECEIPT_HASH,
            TOKEN_URI
        );
    }

    function test_mintInvoice_revertsIfZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(DonationInvoices.ZeroAmount.selector);
        invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 0, 0, 0, keccak256("stripe:pi:test-005"), RECEIPT_HASH, TOKEN_URI
        );
    }

    function test_mintInvoice_grantsFidelityPointsWhenConfigured() public {
        vm.prank(owner);
        invoices.setFidelityCard(address(fidelityCard));

        uint256 tokenId = _mintWithWallet();

        assertEq(fidelityCard.grantCount(), 1);
        (address grantedTo, uint256 grantedPoints, uint256 grantedInvoiceId) = fidelityCard.lastGrant();
        assertEq(grantedTo, donor);
        assertEq(grantedPoints, 100);
        assertEq(grantedInvoiceId, tokenId);
    }

    function test_mintInvoice_skipsFidelityWhenPointsZero() public {
        vm.prank(owner);
        invoices.setFidelityCard(address(fidelityCard));

        vm.prank(owner);
        invoices.mintInvoice(
            donor, ASSOCIATION_ID, donor, bytes32(0), 10_000_000, 0, 0, PAYMENT_HASH, RECEIPT_HASH, TOKEN_URI
        );

        assertEq(fidelityCard.grantCount(), 0);
    }

    function test_getInvoice_revertsForUnknownToken() public {
        vm.expectRevert();
        invoices.getInvoice(999);
    }

    function test_supportsInterface() public view {
        assertTrue(invoices.supportsInterface(0x01ffc9a7)); // IERC165
        assertTrue(invoices.supportsInterface(0x80ac58cd)); // IERC721
        assertTrue(invoices.supportsInterface(0x5b5e139f)); // IERC721Metadata
        assertFalse(invoices.supportsInterface(0xdeadbeef));
    }

    function test_setFidelityCard_emitsEventAndUpdates() public {
        vm.startPrank(owner);
        vm.expectEmit(true, true, false, true);
        emit FidelityCardUpdated(address(0), address(fidelityCard));
        invoices.setFidelityCard(address(fidelityCard));
        assertEq(address(invoices.fidelityCard()), address(fidelityCard));

        vm.expectEmit(true, true, false, true);
        emit FidelityCardUpdated(address(fidelityCard), address(0));
        invoices.setFidelityCard(address(0));
        assertEq(address(invoices.fidelityCard()), address(0));
        vm.stopPrank();
    }

    function test_setFidelityCard_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        invoices.setFidelityCard(address(fidelityCard));
    }

    function test_mintInvoice_incrementsTokenId() public {
        uint256 first = _mintWithWallet();

        vm.prank(owner);
        uint256 second = invoices.mintInvoice(
            donor,
            ASSOCIATION_ID,
            donor,
            bytes32(0),
            1_000_000,
            0,
            10,
            keccak256("stripe:pi:test-006"),
            RECEIPT_HASH,
            "ipfs://receipt-2"
        );

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(invoices.nextTokenId(), 3);
    }

    function test_mintInvoice_skipsFidelityWhenCardNotSet() public {
        uint256 tokenId = _mintWithWallet();
        assertEq(fidelityCard.grantCount(), 0);
        assertGt(invoices.getInvoice(tokenId).pointsEarned, 0);
    }

    function test_constructor_setsProtocolAndOwner() public view {
        assertEq(address(invoices.donNationProtocol()), address(protocol));
        assertEq(invoices.owner(), owner);
        assertEq(invoices.name(), "DonNation Donation Receipt");
        assertEq(invoices.symbol(), "DNINV");
        assertEq(invoices.nextTokenId(), 1);
    }
}
