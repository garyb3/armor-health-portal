/**
 * Returns human-readable elapsed time from a given date string to now.
 * e.g. "2h 15m", "1d 5h", "< 1m"
 */
export function formatElapsed(dateString: string): string {
  const ms = Date.now() - new Date(dateString).getTime();
  if (ms < 0) return "< 1m";

  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "< 1m";
}

/**
 * Returns true if the given date is more than `thresholdHours` ago.
 */
export function isOverdue(dateString: string, thresholdHours: number): boolean {
  const ms = Date.now() - new Date(dateString).getTime();
  return ms > thresholdHours * 60 * 60 * 1000;
}
