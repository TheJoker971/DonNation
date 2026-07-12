"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDonorLevel = getDonorLevel;
exports.getDonorLevelLabel = getDonorLevelLabel;
function getDonorLevel(totalPoints) {
    if (totalPoints >= 1000)
        return 'platinum';
    if (totalPoints >= 500)
        return 'gold';
    if (totalPoints >= 100)
        return 'silver';
    return 'bronze';
}
function getDonorLevelLabel(level) {
    const labels = {
        bronze: 'Bronze',
        silver: 'Silver',
        gold: 'Gold',
        platinum: 'Platinum',
    };
    return labels[level];
}
//# sourceMappingURL=donor-level.util.js.map