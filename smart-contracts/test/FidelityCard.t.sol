pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {FidelityCard} from "../src/FidelityCard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FidelityCardTest is Test {
    FidelityCard public fidelityCard;

    function setUp() public {
        fidelityCard = new FidelityCard(address(1), "Test Association", "TEST", "https://test.com");
    }

    function test_Mint() public {
        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Mint(address(2), 100);
        fidelityCard.mint(address(2), 100);
        
        assertEq(fidelityCard.getBalance(address(2)), 100);
        assertEq(fidelityCard.getTotalSupply(), 1);
        assertEq(fidelityCard.getTokenId(address(2)), 1);
        assertEq(fidelityCard.tokenURI(), "https://test.com");
    }

    function test_AddPoints() public {
        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Mint(address(2), 100);
        fidelityCard.mint(address(2), 100);

        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.AddPoints(address(2), 100);
        fidelityCard.mint(address(2), 100);

        assertEq(fidelityCard.getBalance(address(2)), 200);
        assertEq(fidelityCard.getTotalSupply(), 1);
        assertEq(fidelityCard.getTokenId(address(2)), 1);
        assertEq(fidelityCard.tokenURI(), "https://test.com");
    }

    function test_Burn_NotEnoughPoints() public {
        vm.prank(address(1));
        vm.expectRevert(abi.encodeWithSelector(FidelityCard.NotEnoughPoints.selector, 100));
        fidelityCard.burn(address(2), 100);

        assertEq(fidelityCard.getBalance(address(2)), 0);
        assertEq(fidelityCard.getTotalSupply(), 0);
        assertEq(fidelityCard.getTokenId(address(2)), 0);
        assertEq(fidelityCard.tokenURI(), "https://test.com");
    }

    function test_Burn() public {
        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Mint(address(2), 100);
        fidelityCard.mint(address(2), 100);

        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.Burn(address(2), 100);
        fidelityCard.burn(address(2), 100);

        assertEq(fidelityCard.getBalance(address(2)), 0);
        assertEq(fidelityCard.getTotalSupply(), 1);
        assertEq(fidelityCard.getTokenId(address(2)), 1);
        assertEq(fidelityCard.tokenURI(), "https://test.com");
    }

    function test_ChangeURI() public {
        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.ChangeURI("https://test.com/new");
        fidelityCard.changeURI("https://test.com/new");

        assertEq(fidelityCard.tokenURI(), "https://test.com/new");
    }

    function test_ChangeCardType() public {
        vm.prank(address(1));
        fidelityCard.mint(address(2), 100);

        vm.prank(address(1));
        vm.expectEmit(true, true, true, true);
        emit FidelityCard.ChangeCardType(1, FidelityCard.CardType.Gold);
        fidelityCard.changeCardType(address(2), FidelityCard.CardType.Gold);

        assert(fidelityCard.getCardType(address(2)) == FidelityCard.CardType.Gold);
    }

    function test_ChangeCardType_NotOwner() public {
        vm.prank(address(2));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(2)));
        fidelityCard.changeCardType(address(2), FidelityCard.CardType.Gold);
    }

    function test_Name() public {
        assertEq(fidelityCard.name(), "Test Association");
    }

    function test_Symbol() public {
        assertEq(fidelityCard.symbol(), "TEST");
    }

    function test_TotalSupply() public {
        assertEq(fidelityCard.getTotalSupply(), 0);
    }

    function test_TokenId() public {
        assertEq(fidelityCard.getTokenId(address(2)), 0);
    }
    
    function test_TokenURI() public {
        assertEq(fidelityCard.tokenURI(), "https://test.com");
    }

    function test_GetBalance() public {
        assertEq(fidelityCard.getBalance(address(2)), 0);
    }
    
    
}