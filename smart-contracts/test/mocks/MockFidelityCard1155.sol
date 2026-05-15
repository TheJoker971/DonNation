// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IFidelityCard1155} from "../../src/interfaces/IFidelityCard1155.sol";

/// @dev Mock pour vérifier l'appel à grantPoints depuis DonationInvoices.
contract MockFidelityCard1155 is IFidelityCard1155 {
    struct GrantRecord {
        address to;
        uint256 points;
        uint256 invoiceTokenId;
    }

    GrantRecord public lastGrant;
    uint256 public grantCount;

    function grantPoints(address to, uint256 points, uint256 invoiceTokenId) external {
        lastGrant = GrantRecord({to: to, points: points, invoiceTokenId: invoiceTokenId});
        grantCount++;
    }
}
