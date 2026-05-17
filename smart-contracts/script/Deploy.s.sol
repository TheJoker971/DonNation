// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DonNationProtocol} from "../src/DonNationProtocol.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";
import {FidelityCard} from "../src/FidelityCard.sol";

/// @title DeployDonNation
/// @notice Déploie l'ensemble du protocole DonNation.
/// @dev Ordre : Protocol → Invoices(protocol) → FidelityCard(protocol) → setContracts.
///      Requis : PRIVATE_KEY
///      Commande : forge script script/Deploy.s.sol:DeployDonNation --rpc-url base_sepolia --broadcast -vvvv
contract DeployDonNation is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        DonNationProtocol protocol = new DonNationProtocol(deployer);
        console2.log("DonNationProtocol deployed:", address(protocol));

        DonationInvoices invoices = new DonationInvoices(address(protocol));
        console2.log("DonationInvoices deployed:", address(invoices));

        FidelityCard fidelityCard = new FidelityCard(address(protocol));
        console2.log("FidelityCard deployed:", address(fidelityCard));

        protocol.setContracts(address(invoices), address(fidelityCard));
        console2.log("Contracts linked to protocol.");

        vm.stopBroadcast();
    }
}
