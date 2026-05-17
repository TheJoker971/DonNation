// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDonNationProtocol {
    /// @notice Retourne true si l'association est active et peut recevoir des donations.
    function isAssociationActive(uint256 associationId) external view returns (bool);
}
