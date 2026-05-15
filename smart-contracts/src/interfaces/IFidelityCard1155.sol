// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IFidelityCard1155
/// @notice Attribution de points fidélité après une donation (impl: FidelityCard1155.sol).
interface IFidelityCard1155 {
  function grantPoints(address to, uint256 points, uint256 invoiceTokenId) external;
}
