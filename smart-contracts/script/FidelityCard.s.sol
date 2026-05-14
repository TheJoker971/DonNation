pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

contract FidelityCardScript is Script {
    function run() public {
        vm.startBroadcast();
        new FidelityCard(msg.sender, "Test Association", "TEST", "https://test.com");
        vm.stopBroadcast();
    }
}