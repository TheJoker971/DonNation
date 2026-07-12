import { keccak256, toUtf8Bytes } from 'ethers';

/** UUID asso → bytes32 on-chain (keccak256 du UUID string). */
export function associationUuidToBytes32(associationId: string): string {
  return keccak256(toUtf8Bytes(associationId));
}
