// Reuse the browser's Unicode grapheme rules; do not split accented letters,
// supplementary characters, flags, or joined emoji into broken initials.
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

export function solverInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (segmenter) {
    return segmenter.segment(trimmed)[Symbol.iterator]().next().value.segment.toUpperCase();
  }
  // Older browsers get a neutral avatar for complex text, while the adjacent
  // full name stays intact. This avoids shipping a segmentation polyfill.
  return /^[\x20-\x7e]+$/.test(trimmed) ? trimmed[0].toUpperCase() : '?';
}
