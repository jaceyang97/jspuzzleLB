import React from 'react';

export type AnnouncementIconVariant =
  | 'folded-horn'
  | 'street-speaker'
  | 'ink-cutout'
  | 'cranked-trumpet'
  | 'pocket-megaphone';

type Ray = readonly [number, number, number, number];
type IconDefinition = {
  name: string;
  description: string;
  outline: string;
  detail: string;
  solid: string;
  rays: readonly [Ray, Ray, Ray];
};

// Original vector studies inspired by folded paper and hand-printed signage.
// Every variant has exactly three straight projecting rays. The intentionally
// irregular silhouettes remain deterministic; no filters or random jitter.
export const announcementIconDefinitions: Record<AnnouncementIconVariant, IconDefinition> = {
  'folded-horn': {
    name: 'Folded horn',
    description: 'An open paper cone, a bent handle, and a strong ink outline.',
    outline: 'M5 20 14 19 29 9 30 33 14 28 5 28Z M12 28 19 30 17 40 11 38Z',
    detail: 'M14 19 14 28 M26 12 27 30 M6 24 11 23',
    solid: '',
    rays: [[34, 14, 41, 9], [35, 23, 44, 22], [34, 32, 41, 37]],
  },
  'street-speaker': {
    name: 'Street speaker',
    description: 'A fixed loudspeaker with a crooked bracket and a broad mouth.',
    outline: 'M5 18 12 17 28 10 30 32 13 27 6 28Z M11 29 12 39 27 39 26 35 17 35 17 29',
    detail: 'M25 12 27 29 M10 19 11 26 M20 15 21 28',
    solid: '',
    rays: [[34, 13, 41, 8], [35, 22, 44, 21], [34, 31, 42, 36]],
  },
  'ink-cutout': {
    name: 'Ink cutout',
    description: 'A bold cut-paper silhouette with one sharp, open fold.',
    outline: '',
    detail: '',
    solid: 'M4 19 13 18 30 8 31 34 20 31 17 41 10 39 12 29 4 28Z M16 21 27 14 28 29 16 25Z',
    rays: [[35, 13, 42, 8], [36, 22, 44, 21], [35, 32, 42, 37]],
  },
  'cranked-trumpet': {
    name: 'Cranked trumpet',
    description: 'An improvised speaking trumpet with an offset, winding neck.',
    outline: 'M5 28 11 28 11 19 18 18 29 9 31 31 20 27 17 25 17 35 6 36Z',
    detail: 'M26 12 28 28 M18 18 20 27 M7 31 12 31',
    solid: '',
    rays: [[35, 13, 41, 8], [36, 22, 44, 21], [35, 31, 42, 35]],
  },
  'pocket-megaphone': {
    name: 'Pocket megaphone',
    description: 'A compact boxy horn with an oversized, folded handle.',
    outline: 'M6 18 16 17 25 12 29 14 30 30 26 33 16 28 6 28Z M12 29 20 30 20 39 12 38Z',
    detail: 'M25 12 26 33 M7 21 15 20 M17 18 18 28 M16 31 16 35',
    solid: '',
    rays: [[34, 14, 41, 9], [35, 23, 44, 23], [34, 32, 41, 37]],
  },
};

export interface AnnouncementIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  // Required deliberately: this study does not select a product default.
  variant: AnnouncementIconVariant;
  label?: string;
}

export const AnnouncementIcon: React.FC<AnnouncementIconProps> = ({
  variant,
  label,
  width = 32,
  height = 32,
  ...props
}) => {
  const icon = announcementIconDefinitions[variant];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-announcement-icon={variant}
      {...props}
    >
      <g data-speaker-body="">
        {icon.outline && <path d={icon.outline} />}
        {icon.detail && <path d={icon.detail} strokeWidth={1.65} />}
        {icon.solid && <path d={icon.solid} fill="currentColor" fillRule="evenodd" stroke="none" />}
      </g>
      <g data-sound-rays="" strokeWidth={2.8}>
        {icon.rays.map(([x1, y1, x2, y2], index) => (
          <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
    </svg>
  );
};

export default AnnouncementIcon;
