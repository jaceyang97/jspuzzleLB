import React from 'react';

export default function HeaderTitle() {
  return (
    <h1 className="header-title" aria-label="Jane Street Puzzle Leaderboard, unofficial">
      <span className="title-bold header-brand-name" aria-hidden="true">
        <span className="title-full">Jane Street</span>
        <span className="title-short">JS</span>
        <svg className="unofficial-mark" viewBox="0 0 220 86" aria-hidden="true" focusable="false">
          <g transform="rotate(-2 110 40)">
            <text x="110" y="52" textAnchor="middle">unofficial</text>
            <path d="M188 17C148 4 69 11 35 27C8 40 18 61 54 68C94 77 178 64 199 46C216 31 200 16 169 12" strokeWidth="1.9" />
            <path d="M184 12C143 3 67 17 34 35C16 46 28 65 62 70C102 76 178 61 196 43C208 31 199 19 182 18" strokeWidth="1.4" />
          </g>
        </svg>
      </span>
      <span className="title-separator" aria-hidden="true">|</span>
      <span className="title-regular">Puzzle Leaderboard</span>
    </h1>
  );
}
