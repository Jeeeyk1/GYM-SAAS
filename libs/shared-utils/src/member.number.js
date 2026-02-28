"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMemberNumber = formatMemberNumber;
exports.parseMemberNumber = parseMemberNumber;
function formatMemberNumber(prefix, sequence) {
    return `${prefix.toUpperCase()}-${String(sequence).padStart(6, '0')}`;
}
function parseMemberNumber(memberNumber) {
    const [prefix, seq] = memberNumber.split('-');
    return { prefix, sequence: parseInt(seq, 10) };
}
//# sourceMappingURL=member.number.js.map