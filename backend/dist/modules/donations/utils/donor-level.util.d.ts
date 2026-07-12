export type DonorLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
export declare function getDonorLevel(totalPoints: number): DonorLevel;
export declare function getDonorLevelLabel(level: DonorLevel): string;
