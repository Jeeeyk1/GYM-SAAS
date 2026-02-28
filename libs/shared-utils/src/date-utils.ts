/**
 * Returns true if the given ISO date string is expired
 */
export function isExpired(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

/**
 * Returns a human-readable relative time string
 * e.g. "2 hours ago", "just now"
 */
export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}