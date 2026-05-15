// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IDonNationProtocol} from "./interfaces/IDonNationProtocol.sol";

/// @title DonNationProtocol
/// @notice Registre V1 des associations (testnet / bootstrap).
/// @dev Version minimale pour déploiement et tests. À aligner avec l’implémentation finale de l’équipe.
contract DonNationProtocol is IDonNationProtocol, Ownable {
    mapping(uint256 => bool) private _active;

    constructor() Ownable(msg.sender) {}

    /// @notice Active ou désactive une association pour recevoir des donations.
    function setAssociationActive(uint256 associationId, bool active) external onlyOwner {
        _active[associationId] = active;
    }

    /// @inheritdoc IDonNationProtocol
    function isAssociationActive(uint256 associationId) external view returns (bool) {
        return _active[associationId];
    }
}
