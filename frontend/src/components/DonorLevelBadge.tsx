import type { DonorLevel } from '@/lib/donor-level';
import { getDonorLevelLabel, getDonorLevelStyles } from '@/lib/donor-level';

interface DonorLevelBadgeProps {
  level: DonorLevel;
  className?: string;
}

export function DonorLevelBadge({ level, className = '' }: DonorLevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getDonorLevelStyles(level)} ${className}`}
    >
      {getDonorLevelLabel(level)}
    </span>
  );
}
