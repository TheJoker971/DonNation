// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DonNationProtocol} from "../src/DonNationProtocol.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

contract DonNationProtocolScript is Script {
    function run() public {
        vm.startBroadcast();
        DonNationProtocol protocol = new DonNationProtocol(address(msg.sender));
        DonationInvoices invoices = new DonationInvoices(address(protocol));
        FidelityCard fidelityCard = new FidelityCard(address(protocol));
        protocol.setContracts(address(invoices), address(fidelityCard));
        console.log("DonNationProtocol deployed:", address(protocol));
        console.log("DonationInvoices deployed:", address(invoices));
        console.log("FidelityCard deployed:", address(fidelityCard));
        vm.stopBroadcast();
    }
}
