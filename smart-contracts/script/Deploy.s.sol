// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DonNationProtocol} from "../src/DonNationProtocol.sol";
import {DonationInvoices} from "../src/DonationInvoices.sol";

/// @title DeployDonNation
/// @notice Déploie DonNationProtocol (si besoin) puis DonationInvoices sur Base Sepolia.
/// @dev Lit uniquement `smart-contracts/.env` (auto-chargé par `forge` depuis ce dossier).
///      Requis : PRIVATE_KEY (hex, ex. 0x...), BASE_SEPOLIA_RPC_URL
///      Optionnel : DON_NATION_PROTOCOL_ADDRESS, FIDELITY_CARD_ADDRESS
///      Commande : forge script script/Deploy.s.sol:DeployDonNation --rpc-url base_sepolia --broadcast -vvvv
contract DeployDonNation is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);

    address protocolAddress = vm.envOr("DON_NATION_PROTOCOL_ADDRESS", address(0));

    if (protocolAddress == address(0)) {
      DonNationProtocol protocol = new DonNationProtocol();
      protocolAddress = address(protocol);
      console2.log("DonNationProtocol deployed:", protocolAddress);
    } else {
      console2.log("Using existing DonNationProtocol:", protocolAddress);
    }

    DonationInvoices invoices = new DonationInvoices(protocolAddress);
    console2.log("DonationInvoices deployed:", address(invoices));
    console2.log("DonationInvoices owner:", invoices.owner());

    vm.stopBroadcast();
  }
}
