pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

contract FidelityCardScript is Script {
    // metadata of the fidelity card

    function run() public {
        vm.startBroadcast();
        FidelityCard fidelityCard = new FidelityCard(
            msg.sender,
            "Jokers Club",
            "JOK",
            "https://aquamarine-known-rabbit-370.mypinata.cloud/ipfs/bafkreidffa3z6zisvpdbmhd24on432alhoxyethtci3tprjhkzzmaoomym"
        );
        fidelityCard.mint(address(0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E), 500);
        console.log("Fidelity Card minted for 0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E");
        console.log(
            "Fidelity Card balance of 0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E: %s",
            fidelityCard.getBalance(address(0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E))
        );
        console.log("Fidelity Card total supply: %s", fidelityCard.totalSupply());
        console.log(
            "Fidelity Card token ID of 0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E: %s",
            fidelityCard.getTokenId(address(0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E))
        );
        console.log("Fidelity Card name: %s", fidelityCard.name());
        console.log("Fidelity Card symbol: %s", fidelityCard.symbol());
        console.log(
            "Tokenid of 0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E: %s",
            fidelityCard.getTokenId(address(0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E))
        );
        console.log("Owner of tokenid 1: %s", fidelityCard.ownerOf(1));
        vm.stopBroadcast();
    }
}
