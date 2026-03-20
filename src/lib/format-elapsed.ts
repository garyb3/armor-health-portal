/**
 * Returns human-readable elapsed time from a given date string to now.
 * e.g. "3d", "1d", "< 1d"
 */
export function formatElapsed(dateString: string): string {
  const ms = Date.now() - new Date(dateString).getTime();
  if (ms < 0) return "< 1d";

  const days = Math.floor(ms / 86_400_000);

  if (days > 0) return `${days}d`;
  return "< 1d";
}

/**
 * Formats a duration in milliseconds to human-readable form.
 * e.g. 90000000 → "1d", 259200000 → "3d"
 */
export function formatDurationMs(ms: number): string {
  if (ms < 0) return "< 1d";

  const days = Math.floor(ms / 86_400_000);

  if (days > 0) return `${days}d`;
  return "< 1d";
}

/**
 * Returns true if the given date is more than `thresholdHours` ago.
 */
export function isOverdue(dateString: string, thresholdHours: number): boolean {
  const ms = Date.now() - new Date(dateString).getTime();
  return ms > thresholdHours * 60 * 60 * 1000;
}
