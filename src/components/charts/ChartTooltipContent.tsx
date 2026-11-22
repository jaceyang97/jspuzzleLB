import { Tooltip, TooltipContent } from '@ui-sdk/react/tooltip';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DefaultTooltipContent, TooltipProps } from 'recharts';
import '../Tooltip.css';

type ChartTooltipProps = TooltipProps<number, string>;

/** Recharts v2 has no portal prop; portal its formatted content instead. */
export default function ChartTooltipContent(props: ChartTooltipProps) {
  const marker = useRef<HTMLSpanElement>(null);
  const chart = useRef<HTMLElement | null>(null);

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
    if (!element) return new DOMRect();
    const bounds = element.getBoundingClientRect();
    const scaleX = element.offsetWidth ? bounds.width / element.offsetWidth : 1;
    const scaleY = element.offsetHeight ? bounds.height / element.offsetHeight : 1;
    const left = bounds.left + (displayed.coordinate?.x ?? 0) * scaleX;
    const top = bounds.top + (displayed.coordinate?.y ?? 0) * scaleY;
    return DOMRect.fromRect({ x: left, y: top });
  }, [displayed.coordinate?.x, displayed.coordinate?.y]);
  const anchor = React.useMemo(() => ({ getBoundingClientRect: reference }), [reference]);
  useEffect(() => {
    clearClose();
    if (active) setRetained(true);
    else if (!hovered.current) closeTimer.current = window.setTimeout(() => setRetained(false), 140);
    return clearClose;
  }, [active, clearClose]);
  return <>
    <span ref={marker} aria-hidden="true" hidden />
    <Tooltip open={open} onOpenChange={next => {
      if (!next) { clearClose(); hovered.current = false; setRetained(false); setDismissedPoint(point); }
    }}>
      <TooltipContent anchor={anchor} side="bottom" sideOffset={8} collisionPadding={8}
        container={chart.current?.closest('[aria-modal="true"], dialog[open]') ?? document.body}
        className="ui-tooltip ui-tooltip-portal ui-chart-tooltip" style={{ ...displayed.contentStyle, padding: 0 }}
        onMouseEnter={() => { hovered.current = true; clearClose(); }}
        onMouseLeave={() => { hovered.current = false; if (!active) setRetained(false); }}>
        <span className="ui-tooltip-content" data-tooltip-content="">
          <DefaultTooltipContent {...displayed} contentStyle={{ ...displayed.contentStyle, maxWidth: '100%',
            padding: 0, border: 0, background: 'transparent', whiteSpace: 'normal', overflowWrap: 'anywhere' }} />
        </span>
      </TooltipContent>
    </Tooltip>
  </>;
}
