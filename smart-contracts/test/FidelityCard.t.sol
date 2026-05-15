// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {FidelityCard} from "../src/FidelityCard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FidelityCardTest is Test {
    event Minted(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event PointsAdded(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event Burned(uint256 indexed tokenId, address indexed owner, uint256 amount);

    FidelityCard internal card;
    address internal constant owner = address(0xA11);
    address internal constant user = address(0xB0B);
    string internal constant uri = "https://example.com/meta.json";

    function setUp() public {
        vm.prank(owner);
        card = new FidelityCard(owner);
    }

    function test_Mint_tokenURI_and_ownerOf() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Minted(1, user, 100);
        card.mint(user, 100, uri);

        assertEq(card.ownerOf(1), user);
        assertEq(card.tokenURI(1), uri);
        assertEq(card.getTokenId(user), 1);
        assertEq(card.totalSupply(), 1);
    }

    function test_Transfer_reverts() public {
        vm.prank(owner);
        card.mint(user, 100, uri);

        vm.prank(user);
        vm.expectRevert(FidelityCard.NON_TRANSFERABLE.selector);
        card.transferFrom(user, address(0xC0C), 1);
    }

    function test_addPoints() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.expectEmit(true, true, true, true);
        emit PointsAdded(1, user, 25);
        card.addPoints(user, 25);
        vm.stopPrank();

        assertEq(card.balanceOf(user), 75);
        assertEq(card.totalEarned(user), 75);
        assertEq(card.totalSupply(), 1);
        assertEq(card.getTokenId(user), 1);
    }

    function test_addPoints_reverts_if_not_minted() public {
        vm.prank(owner);
        vm.expectRevert(FidelityCard.NOT_MINTED.selector);
        card.addPoints(user, 25);
    }

    function test_addPoints_reverts_if_not_owner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        card.addPoints(user, 25);
        vm.stopPrank();
    }

    function test_mint_reverts_if_already_minted() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.expectRevert(FidelityCard.ALREADY_MINTED.selector);
        card.mint(user, 25, uri);
        vm.stopPrank();
    }

    function test_setCardType() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        card.setCardType(1, FidelityCard.CardType.WOOD);
        vm.stopPrank();

        assert(card.cardType(1) == FidelityCard.CardType.WOOD);
    }

    function test_setCardType_reverts_if_not_owner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        card.setCardType(1, FidelityCard.CardType.WOOD);
        vm.stopPrank();
    }

    function test_setTokenURI() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        card.setTokenURI(1, "https://example.com/meta2.json");
        vm.stopPrank();

        assertEq(card.tokenURI(1), "https://example.com/meta2.json");
    }

    function test_setTokenURI_reverts_if_not_owner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        card.setTokenURI(1, "https://example.com/meta2.json");
        vm.stopPrank();
    }

    function test_getTokenId() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.getTokenId(user), 1);
    }

    function test_isMinted() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assert(card.isMinted(user));
    }

    function test_totalSupply() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.totalSupply(), 1);
    }

    function test_totalBurned() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.totalBurned(), 0);
    }

    function test_totalEarned() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.totalEarned(user), 50);
    }

    function test_balanceOf() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.balanceOf(user), 50);
    }

    function test_ownerOf() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        assertEq(card.ownerOf(1), user);
    }

    function test_burn() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.expectEmit(true, true, true, true);
        emit Burned(1, user, 30);
        card.burn(user, 30);
        vm.stopPrank();

        assertEq(card.balanceOf(user), 20);
        assertEq(card.totalBurned(), 30);
        assertEq(card.totalSupply(), 1);
    }

    function test_burn_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.INSUFFICIENT_BALANCE.selector, 50));
        vm.prank(owner);
        card.burn(user, 50);
    }

    function test_burn_reverts_if_not_owner() public {
        vm.startPrank(owner);
        card.mint(user, 50, uri);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        card.burn(user, 50);
        vm.stopPrank();
    }
}
