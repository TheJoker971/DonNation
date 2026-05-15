// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDonNationProtocol
/// @notice Interface minimale du registre associations (impl: DonNationProtocol.sol).
interface IDonNationProtocol {
    function isAssociationActive(uint256 associationId) external view returns (bool);
}
