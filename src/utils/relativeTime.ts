// Format an ISO timestamp (or Date) as a short relative time string,
// e.g. "just now", "5 min ago", "3 days ago", "2 mo ago".
export const formatRelativeTime = (input: string | Date | undefined): string => {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 0) return 'in the future';
  if (diffSec < 45) return 'just now';

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo} mo ago`;

  const diffYr = Math.round(diffMo / 12);
  return `${diffYr} yr${diffYr === 1 ? '' : 's'} ago`;
};

// Format an ISO timestamp as a long, exact human-readable string for tooltips.
export const formatExactTime = (input: string | Date | undefined): string => {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
