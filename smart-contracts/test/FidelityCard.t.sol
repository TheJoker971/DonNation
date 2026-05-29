// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FidelityCard} from "../src/FidelityCard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FidelityCardTest is Test {
    FidelityCard internal card;

    address internal constant OWNER = address(0xA11);
    address internal constant USER = address(0xB0B);
    address internal constant OTHER = address(0xC0C);

    // UUIDs encodés en bytes32 (ex: keccak256 d'un UUID string)
    bytes32 internal constant ASSOC_1 = keccak256("550e8400-e29b-41d4-a716-446655440001");
    bytes32 internal constant ASSOC_2 = keccak256("550e8400-e29b-41d4-a716-446655440002");

    string internal constant URI_1 = "ipfs://card-assoc1";
    string internal constant URI_2 = "ipfs://card-assoc2";

    function setUp() public {
        vm.prank(OWNER);
        card = new FidelityCard(OWNER);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _mintAssoc1(uint256 amount) internal {
        vm.prank(OWNER);
        card.mint(USER, ASSOC_1, amount, URI_1);
    }

    function _mintAssoc2(uint256 amount) internal {
        vm.prank(OWNER);
        card.mint(USER, ASSOC_2, amount, URI_2);
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function test_constructor() public view {
        assertEq(card.owner(), OWNER);
        assertEq(card.name(), "FidelityCard");
        assertEq(card.symbol(), "FC");
        assertEq(card.totalSupply(), 0);
        assertEq(card.totalBurnedPoints(), 0);
    }

    // ─── mint ─────────────────────────────────────────────────────────────────

    function test_mint_succeeds() public {
        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Minted(1, USER, ASSOC_1, 100);
        card.mint(USER, ASSOC_1, 100, URI_1);

        assertEq(card.ownerOf(1), USER);
        assertEq(card.tokenURI(1), URI_1);
        assertEq(card.totalSupply(), 1);
        assertEq(card.balanceOf(USER), 1); // 1 NFT

        FidelityCard.CardData memory data = card.getCard(USER, ASSOC_1);
        assertEq(data.tokenId, 1);
        assertEq(data.associationId, ASSOC_1);
        assertEq(data.balance, 100);
        assertEq(data.totalEarned, 100);
        assertEq(uint8(data.cardType), uint8(FidelityCard.CardType.WOOD));
    }

    function test_mint_multipleAssociations() public {
        _mintAssoc1(50);
        _mintAssoc2(80);

        assertEq(card.totalSupply(), 2);
        assertEq(card.balanceOf(USER), 2); // 2 NFTs

        assertEq(card.getCard(USER, ASSOC_1).tokenId, 1);
        assertEq(card.getCard(USER, ASSOC_2).tokenId, 2);
        assertEq(card.getCard(USER, ASSOC_1).balance, 50);
        assertEq(card.getCard(USER, ASSOC_2).balance, 80);

        bytes32[] memory assocs = card.getUserAssociations(USER);
        assertEq(assocs.length, 2);
        assertEq(assocs[0], ASSOC_1);
        assertEq(assocs[1], ASSOC_2);
    }

    function test_mint_reverts_if_not_owner() public {
        vm.prank(USER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, USER));
        card.mint(USER, ASSOC_1, 100, URI_1);
    }

    function test_mint_reverts_if_invalid_association_id() public {
        vm.prank(OWNER);
        vm.expectRevert(FidelityCard.INVALID_ASSOCIATION_ID.selector);
        card.mint(USER, bytes32(0), 100, URI_1);
    }

    function test_mint_reverts_if_already_minted_same_association() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.ALREADY_MINTED.selector, ASSOC_1));
        card.mint(USER, ASSOC_1, 25, URI_1);
    }

    // ─── addPoints ────────────────────────────────────────────────────────────

    function test_addPoints_succeeds() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.PointsAdded(1, USER, ASSOC_1, 25);
        card.addPoints(USER, ASSOC_1, 25);

        FidelityCard.CardData memory data = card.getCard(USER, ASSOC_1);
        assertEq(data.balance, 75);
        assertEq(data.totalEarned, 75);
    }

    function test_addPoints_independent_per_association() public {
        _mintAssoc1(50);
        _mintAssoc2(30);

        vm.startPrank(OWNER);
        card.addPoints(USER, ASSOC_1, 10);
        card.addPoints(USER, ASSOC_2, 20);
        vm.stopPrank();

        assertEq(card.getCard(USER, ASSOC_1).balance, 60);
        assertEq(card.getCard(USER, ASSOC_2).balance, 50);
    }

    function test_addPoints_reverts_if_not_minted() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.NOT_MINTED.selector, ASSOC_1));
        card.addPoints(USER, ASSOC_1, 25);
    }

    function test_addPoints_reverts_if_not_owner() public {
        vm.prank(USER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, USER));
        card.addPoints(USER, ASSOC_1, 25);
    }

    // ─── burn (points) ────────────────────────────────────────────────────────

    function test_burn_succeeds() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Burned(1, USER, ASSOC_1, 30);
        card.burn(USER, ASSOC_1, 30);

        assertEq(card.getCard(USER, ASSOC_1).balance, 20);
        assertEq(card.totalBurnedPoints(), 30);
        assertEq(card.totalSupply(), 1); // NFT toujours présent
    }

    function test_burn_reverts_if_insufficient_balance() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.INSUFFICIENT_BALANCE.selector, 100));
        card.burn(USER, ASSOC_1, 100);
    }

    function test_burn_reverts_if_not_minted() public {
        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.NOT_MINTED.selector, ASSOC_1));
        card.burn(USER, ASSOC_1, 10);
    }

    function test_burn_reverts_if_not_owner() public {
        vm.prank(USER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, USER));
        card.burn(USER, ASSOC_1, 10);
    }

    // ─── setCardType ──────────────────────────────────────────────────────────

    function test_setCardType_succeeds() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        card.setCardType(1, FidelityCard.CardType.GOLD);

        assertEq(uint8(card.getCard(USER, ASSOC_1).cardType), uint8(FidelityCard.CardType.GOLD));
    }

    function test_setCardType_reverts_if_not_owner() public {
        vm.prank(USER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, USER));
        card.setCardType(1, FidelityCard.CardType.GOLD);
    }

    // ─── setTokenURI ──────────────────────────────────────────────────────────

    function test_setTokenURI_succeeds() public {
        _mintAssoc1(50);

        vm.prank(OWNER);
        card.setTokenURI(1, "ipfs://updated");

        assertEq(card.tokenURI(1), "ipfs://updated");
    }

    function test_setTokenURI_reverts_if_not_owner() public {
        vm.prank(USER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, USER));
        card.setTokenURI(1, "ipfs://updated");
    }

    // ─── Soulbound ────────────────────────────────────────────────────────────

    function test_transfer_reverts() public {
        _mintAssoc1(100);

        vm.prank(USER);
        vm.expectRevert(FidelityCard.NON_TRANSFERABLE.selector);
        card.transferFrom(USER, OTHER, 1);
    }

    // ─── supportsInterface ────────────────────────────────────────────────────

    function test_supportsInterface() public view {
        assertTrue(card.supportsInterface(0x01ffc9a7)); // IERC165
        assertTrue(card.supportsInterface(0x80ac58cd)); // IERC721
        assertTrue(card.supportsInterface(0x5b5e139f)); // IERC721Metadata
        assertFalse(card.supportsInterface(0xdeadbeef));
    }
}
