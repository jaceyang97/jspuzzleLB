// Color palettes for solver-chip avatar circles.
// Inspired by the NYC MTA subway line colors.

export interface ChipColor {
  bg: string;
  /** Initial-letter color. Picked for AA contrast against bg. */
  text: string;
}

// Visible chips (the first names rendered in the banner) cycle through this
// curated order: blue → orange → green → red → brown → purple. This makes
// the banner read consistently regardless of who joined today.
export const VISIBLE_PALETTE: ChipColor[] = [
  { bg: '#2850AD', text: '#fff' }, // A/C/E blue
  { bg: '#FF6319', text: '#fff' }, // B/D/F/M orange
  { bg: '#00933C', text: '#fff' }, // 4/5/6 green
  { bg: '#EE352E', text: '#fff' }, // 1/2/3 red
  { bg: '#996633', text: '#fff' }, // J/Z brown
  { bg: '#B933AD', text: '#fff' }, // 7 purple
];

// Hidden chips (inside the "N more" tooltip) draw from a wider palette so
// many solvers in one day still get visually-distinct badges. Same MTA
// vocabulary but with the additional yellow / teal / light-green lines.
export const HIDDEN_PALETTE: ChipColor[] = [
  ...VISIBLE_PALETTE,
  { bg: '#6CBE45', text: '#fff' },     // G light-green
  { bg: '#FCCC0A', text: '#1a1a1a' },  // N/Q/R/W yellow (dark text)
  { bg: '#00ADD0', text: '#fff' },     // T teal
];

/** Deterministic per-name color pick from a palette. */
export function colorFromName(name: string, palette: ChipColor[]): ChipColor {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
