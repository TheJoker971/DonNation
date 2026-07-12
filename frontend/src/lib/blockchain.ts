export function getTxExplorerUrl(chainId: number, txHash: string): string | null {
  if (chainId === 84532) {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
  if (chainId === 8453) {
    return `https://basescan.org/tx/${txHash}`;
  }
  return null;
}
