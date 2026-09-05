import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DefaultTooltipContent, TooltipProps } from 'recharts';
import { useFloatingTooltip } from '../useFloatingTooltip';
import '../Tooltip.css';

type ChartTooltipProps = TooltipProps<number, string>;

/** Recharts v2 has no portal prop; portal its formatted content instead. */
export default function ChartTooltipContent(props: ChartTooltipProps) {
  const marker = useRef<HTMLSpanElement>(null);
  const chart = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const lastProps = useRef(props);
  const closeTimer = useRef<number | null>(null);
  const hovered = useRef(false);
  const [retained, setRetained] = useState(false);
  const [dismissedPoint, setDismissedPoint] = useState<string | null>(null);
  const point = `${props.coordinate?.x}:${props.coordinate?.y}:${props.label}`;
  const active = !!props.active && !!props.payload?.length && dismissedPoint !== point;
  if (active) lastProps.current = props;
  const displayed = active ? props : lastProps.current;
  const open = active || retained;
  const clearClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  useLayoutEffect(() => { chart.current = marker.current?.closest<HTMLElement>('.recharts-wrapper') ?? null; }, []);
  const reference = useCallback(() => {
    const element = chart.current;
    if (!element) return null;
    const bounds = element.getBoundingClientRect();
    const scaleX = element.offsetWidth ? bounds.width / element.offsetWidth : 1;
    const scaleY = element.offsetHeight ? bounds.height / element.offsetHeight : 1;
    const left = bounds.left + (displayed.coordinate?.x ?? 0) * scaleX;
    const top = bounds.top + (displayed.coordinate?.y ?? 0) * scaleY;
    return { left, right: left, top, bottom: top, width: 0, height: 0 };
  }, [displayed.coordinate?.x, displayed.coordinate?.y]);
  const position = useFloatingTooltip(open, chart, tip, reference);
  useEffect(() => {
    clearClose();
    if (active) setRetained(true);
    else if (!hovered.current) closeTimer.current = window.setTimeout(() => setRetained(false), 140);
    return clearClose;
  }, [active, clearClose]);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => { clearClose(); hovered.current = false; setRetained(false); setDismissedPoint(point); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!chart.current?.contains(target) && !tip.current?.contains(target)) dismiss();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open, point, clearClose]);

  return <>
    <span ref={marker} aria-hidden="true" style={{ display: 'none' }} />
    {open && createPortal(<span ref={tip} className="ui-tooltip ui-tooltip-portal ui-chart-tooltip" data-open=""
      role="tooltip" style={{ ...displayed.contentStyle, position: 'fixed', padding: 0, transform: 'none', left: position?.left ?? 0, top: position?.top ?? 0,
        maxWidth: position?.maxWidth, maxHeight: position?.maxHeight, visibility: position?.visible ? 'visible' : 'hidden' }}
      onMouseEnter={() => { hovered.current = true; clearClose(); }}
      onMouseLeave={() => { hovered.current = false; if (!active) setRetained(false); }}>
      <span className="ui-tooltip-content" data-tooltip-content="">
        <DefaultTooltipContent {...displayed} contentStyle={{ ...displayed.contentStyle, maxWidth: '100%',
          padding: 0, border: 0, background: 'transparent', whiteSpace: 'normal', overflowWrap: 'anywhere' }} />
      </span>
    </span>, document.body)}
  </>;
}
