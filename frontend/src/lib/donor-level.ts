export type DonorLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export function getDonorLevelLabel(level: DonorLevel): string {
  const labels: Record<DonorLevel, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
  };
  return labels[level];
}

export function getDonorLevelStyles(level: DonorLevel): string {
  const styles: Record<DonorLevel, string> = {
    bronze: 'bg-amber-100 text-amber-900 border-amber-200',
    silver: 'bg-slate-100 text-slate-800 border-slate-200',
    gold: 'bg-yellow-100 text-yellow-900 border-yellow-200',
    platinum: 'bg-violet-100 text-violet-900 border-violet-200',
  };
  return styles[level];
}

export function getNextLevelHint(level: DonorLevel, totalPoints: number): string | null {
  const thresholds: Record<DonorLevel, number | null> = {
    bronze: 100,
    silver: 500,
    gold: 1000,
    platinum: null,
  };
  const next = thresholds[level];
  if (next == null) return null;
  const remaining = next - totalPoints;
  if (remaining <= 0) return null;
  return `${remaining} pt${remaining > 1 ? 's' : ''} avant le niveau suivant`;
}
