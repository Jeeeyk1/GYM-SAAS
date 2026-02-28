"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExpired = isExpired;
exports.relativeTime = relativeTime;
function isExpired(isoDate) {
    return new Date(isoDate).getTime() < Date.now();
}
function relativeTime(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60)
        return 'just now';
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
//# sourceMappingURL=date-utils.js.map