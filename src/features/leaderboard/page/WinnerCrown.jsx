import React, { useId } from 'react';

const crownShape = 'M32 90C30 76 28 60 26 40C36 50 44 57 52 63C60 50 70 36 80 22C89 36 98 48 108 61C116 54 124 46 134 36C132 56 130 74 129 89C98 92 62 92 32 90Z';

export default function WinnerCrown() {
  const id = useId();
  const maskId = `crown-shine-mask-${id}`;
  const lightId = `crown-shine-light-${id}`;
  return <svg className="flow-winner-crown" aria-hidden="true" focusable="false" viewBox="0 0 160 112" fill="none">
    <defs>
      <clipPath id={maskId} clipPathUnits="userSpaceOnUse" transform="translate(5 4)">
        <path d={crownShape} />
        <circle cx="25" cy="33" r="6" /><circle cx="80" cy="16" r="6" /><circle cx="135" cy="31" r="6" />
      </clipPath>
      <linearGradient id={lightId} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="0.35" stopColor="#FFF8D9" stopOpacity="0.45" />
        <stop offset="0.52" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="0.65" stopColor="#FFF8D9" stopOpacity="0.65" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g className="flow-crown-art">
      <g transform="translate(5 4)" fill="#FFCC33">
        <path d={crownShape} />
        <circle cx="25" cy="33" r="6" /><circle cx="80" cy="16" r="6" /><circle cx="135" cy="31" r="6" />
      </g>
      <g stroke="var(--crown-ink)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={crownShape} />
        <path d="M31 77C62 74 98 74 130 76" />
        <circle cx="25" cy="33" r="5" /><circle cx="80" cy="16" r="5" /><circle cx="135" cy="31" r="5" />
      </g>
      <path d="M21 47C22 60 24 73 26 85" stroke="var(--crown-secondary)" strokeWidth="2" strokeLinecap="round" />
      <g fill="var(--crown-ink)">
        <circle cx="56" cy="84" r="3.2" /><circle cx="80" cy="83.5" r="3.2" /><circle cx="104" cy="83" r="3.2" />
      </g>
    </g>
    <g clipPath={`url(#${maskId})`} pointerEvents="none">
      <g className="flow-crown-sheen">
        <g transform="skewX(-24)"><rect width="30" height="112" fill={`url(#${lightId})`} /></g>
      </g>
    </g>
    <g className="flow-crown-sparkle" pointerEvents="none">
      <path d="M137 13L139 21L147 23L139 25L137 33L135 25L127 23L135 21Z" fill="#FFFDF1" stroke="#DDA31B" strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  </svg>;
}
