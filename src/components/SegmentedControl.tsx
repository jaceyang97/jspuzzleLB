import React, { useLayoutEffect, useRef, useState } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  /** Render buttons as ARIA tabs (role=tablist/tab) instead of toggles. */
  tabs?: boolean;
  className?: string;
}

// iOS-style segmented control with a raised thumb that glides to the active
// segment. Segments keep their natural widths (labels differ), so the thumb
// is measured per segment; its width only changes at the moment of a switch
// on a 26px-tall element, which is imperceptible layout work.
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  tabs,
  className,
}: SegmentedControlProps<T>) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () => {
      const btns = strip.querySelectorAll<HTMLButtonElement>('.segmented-btn');
      const btn = btns[index];
      if (btn) setThumb({ x: btn.offsetLeft, w: btn.offsetWidth });
    };
    measure();
    // Re-measure when fonts load or the strip resizes.
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    return () => ro.disconnect();
  }, [index, options.length]);

  return (
    <div
      ref={stripRef}
      className={`segmented-control${className ? ` ${className}` : ''}`}
      role={tabs ? 'tablist' : 'group'}
      aria-label={ariaLabel}
    >
      <span
        className="segmented-thumb"
        style={
          thumb
            ? { width: thumb.w, transform: `translateX(${thumb.x}px)` }
            : { opacity: 0 }
        }
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={tabs ? 'tab' : undefined}
          aria-selected={tabs ? o.value === value : undefined}
          aria-pressed={!tabs ? o.value === value : undefined}
          className={`segmented-btn${o.value === value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {/* data-label reserves the bold width so the active weight change
              never shifts layout */}
          <span className="seg-label" data-label={o.label}>
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
