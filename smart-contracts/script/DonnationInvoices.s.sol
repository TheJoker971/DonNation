// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

/// @title DonnationInvoices
/// @notice Déploie le contrat DonationInvoices.
/// @dev
contract DonnationInvoicesScript is Script {
    function run() external {
        vm.startBroadcast();

        DonationInvoices invoices = new DonationInvoices(address(msg.sender));
        console2.log("DonationInvoices deployed:", address(invoices));

        vm.stopBroadcast();
    }
}
