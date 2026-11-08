# News banner names — 2026-11-08

- Selected: Opus's Anchored Column. Separate floating pills, transparent outer container, one scrollable column with no visible scrollbar.
- Revision: use the banner's existing pill style in both places: 14px / 500, 18px line height, 4px 10px padding, 14px corners. Only floating pills receive an elevation shadow.
- Density: mouse/trackpad dropdown rows have a 32px hit area and 4px row gap, giving 8px between visible pills. Touch keeps 44px hit areas and 2px row gaps.
- Motion: translateY(-6px), scale(.97), opacity 0 → 1; 200ms entry, 140ms exit, cubic-bezier(.2,.7,.2,1). Stagger 18ms, capped at five intervals (290ms total). Keyboard and reduced-motion actions are immediate.
- Anchor: visible first pill's left edge aligns with +N; clamp to the viewport for long names and narrow screens.
- Rejected: wrapping cluster, inverse-color offset cascade, and the original enclosing white card. The selected prototype's larger, heavier pill typography was also rejected in favor of the existing banner treatment.
