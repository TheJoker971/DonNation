export type DonorLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export function getDonorLevel(totalPoints: number): DonorLevel {
  if (totalPoints >= 1000) return 'platinum';
  if (totalPoints >= 500) return 'gold';
  if (totalPoints >= 100) return 'silver';
  return 'bronze';
}

export function getDonorLevelLabel(level: DonorLevel): string {
  const labels: Record<DonorLevel, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };
  return labels[level];
}
