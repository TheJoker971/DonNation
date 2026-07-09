"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.associationUuidToBytes32 = associationUuidToBytes32;
const ethers_1 = require("ethers");
function associationUuidToBytes32(associationId) {
    return (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(associationId));
}
//# sourceMappingURL=association-id.util.js.map