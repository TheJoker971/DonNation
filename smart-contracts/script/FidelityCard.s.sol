// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

contract FidelityCardScript is Script {
    // metadata of the fidelity card
    string public anvil =
        "https://aquamarine-known-rabbit-370.mypinata.cloud/ipfs/bafkreih2rcbqbjgnqqgzelugq67rjdnou26bdopos5kujcqled4jnldzpy";

    function run() public {
        vm.startBroadcast();
        FidelityCard fidelityCard = new FidelityCard(msg.sender);
        fidelityCard.mint(address(msg.sender), keccak256("550e8400-e29b-41d4-a716-446655440001"), 500, anvil);
        console.log("Fidelity Card minted for 0xAE934c9e17ca46aEb58E88899f14d5bA6e92CC2E");
        console.log("Fidelity Card NFT count: %s", fidelityCard.balanceOf(msg.sender));
        vm.stopBroadcast();
    }
}
