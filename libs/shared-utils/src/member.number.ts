/**
 * Generates a padded member number like GYM-000123
 */
export function formatMemberNumber(prefix: string, sequence: number): string {
  return `${prefix.toUpperCase()}-${String(sequence).padStart(6, '0')}`;
}

export function parseMemberNumber(memberNumber: string): { prefix: string; sequence: number } {
  const [prefix, seq] = memberNumber.split('-');
  return { prefix, sequence: parseInt(seq, 10) };
}