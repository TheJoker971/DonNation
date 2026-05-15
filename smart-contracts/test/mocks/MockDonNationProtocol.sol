// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDonNationProtocol} from "../../src/interfaces/IDonNationProtocol.sol";

/// @dev Mock pour tester DonationInvoices sans le vrai DonNationProtocol.
contract MockDonNationProtocol is IDonNationProtocol {
  mapping(uint256 => bool) private _active;

  function setAssociationActive(uint256 associationId, bool active) external {
    _active[associationId] = active;
  }

  function isAssociationActive(uint256 associationId) external view returns (bool) {
    return _active[associationId];
  }
}
