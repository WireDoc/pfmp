/**
 * Small relative-time formatter — no library dependency. Returns strings like
 * "just now", "27 minutes ago", "in 1 hour", "yesterday", "Mar 14".
 *
 * Two consumer needs in this codebase:
 *   1. The dashboard widgets want a primary relative label ("47 minutes ago")
 *      with the absolute time hidden behind a tooltip for precision.
 *   2. Detail views want both side by side ("47 minutes ago · Mon Jun 22, 8:30 AM").
 *
 * formatRelative() returns the relative label; formatAbsolute() returns the
 * locale-formatted absolute time including the zone abbreviation when possible.
 */

export function formatRelative(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';

  const deltaSec = Math.round((target.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(deltaSec);
  const future = deltaSec > 0;

  // Under 45 seconds counts as "just now" in either direction — sub-minute
  // precision isn't interesting for digest timestamps.
  if (absSec < 45) return 'just now';

  const minutes = Math.round(absSec / 60);
  if (minutes < 60) {
    const unit = minutes === 1 ? 'minute' : 'minutes';
    return future ? `in ${minutes} ${unit}` : `${minutes} ${unit} ago`;
  }

  const hours = Math.round(absSec / 3600);
  if (hours < 24) {
    const unit = hours === 1 ? 'hour' : 'hours';
    return future ? `in ${hours} ${unit}` : `${hours} ${unit} ago`;
  }

  const days = Math.round(absSec / 86400);
  if (days === 1) return future ? 'tomorrow' : 'yesterday';
  if (days < 7) {
    return future ? `in ${days} days` : `${days} days ago`;
  }

  // For longer spans, drop into an absolute date label (locale-formatted).
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Locale-formatted absolute date+time. Includes the timezone abbreviation when
 * the browser exposes one. Used for tooltips and detail-view subtitles.
 */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
