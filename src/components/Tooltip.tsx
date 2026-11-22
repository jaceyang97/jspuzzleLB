import React, { useEffect, useRef, useState } from 'react';
import { Tooltip as SdkTooltip, TooltipContent, TooltipTrigger } from '@ui-sdk/react/tooltip';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@ui-sdk/react/popover';
import './Tooltip.css';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  surfaceClassName?: string;
  openDelay?: number;
  rich?: boolean;
  interactive?: boolean;
  popupLabel?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'content'>;

const Tooltip: React.FC<TooltipProps> = ({
  content, children, as: Tag = 'span', className = '', surfaceClassName = '', openDelay = 400,
  rich, interactive = false, popupLabel, ...rest
}) => {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLElement>(null);
  const pointerFocus = useRef(false);
  const keyboardFocus = useRef(false);
  const trigger = useRef<HTMLElement>(null);
  const body = useRef<HTMLSpanElement>(null);
  const restoring = useRef(false);
  const child = React.isValidElement(children);
  const control = child ? children : <Tag {...rest} tabIndex={rest.tabIndex ?? 0} className={`ui-tooltip-anchor ${className}`}>{children}</Tag>;
  const surface = `ui-tooltip ui-tooltip-portal${rich ? ' rich' : ''} ${surfaceClassName}`;
  const position = { anchor: wrapper.current ?? trigger.current, side: 'bottom' as const, sideOffset: 8, collisionPadding: 8, arrowPadding: 10 };
  const container = trigger.current?.closest('[aria-modal="true"], dialog[open]') ?? document.body;
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const anchor = wrapper.current ?? trigger.current;
    if (!open || !anchor || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setClipped(!entry.isIntersecting));
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [open]);
  const enterContent = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || event.shiftKey || !open || !body.current) return;
    const link = interactive ? body.current.querySelector<HTMLElement>('a[href],button') : null;
    if (link || body.current.scrollHeight > body.current.clientHeight + 1) {
      event.preventDefault();
      (link ?? body.current).focus();
    }
  };
  const returnToPage = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !trigger.current || !body.current) return;
    const links = Array.from(body.current.querySelectorAll<HTMLElement>('a[href],button'));
    const next = links[links.indexOf(event.target as HTMLElement) + (event.shiftKey ? -1 : 1)];
    if (next) return;
    event.preventDefault();
    if (event.shiftKey) { trigger.current.focus(); return; }
    const scope = trigger.current.closest('[aria-modal="true"],dialog[open]') ?? document;
    const stops = Array.from(scope.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,select,[tabindex]'))
      .filter(el => el.tabIndex >= 0 && !el.closest('[hidden],[inert]') && !body.current?.contains(el) && el.checkVisibility?.() !== false);
    const after = stops[stops.indexOf(trigger.current) + 1];
    setOpen(false);
    (after ?? trigger.current).focus();
  };
  const inner = <span ref={body} tabIndex={-1} className="ui-tooltip-content" data-tooltip-content="" onKeyDown={returnToPage}>{content}</span>;
  const wrap = (element: React.ReactNode) => child
    ? <Tag {...rest} ref={wrapper} className={`ui-tooltip-anchor ${className}`}>{element}</Tag> : element;

  if (interactive) return <Popover openOnHover delay={openDelay} closeDelay={140} open={open}
    onOpenChange={(next, details) => { restoring.current = !next && details.reason === 'escape-key'; setOpen(next); }}>
    {wrap(<PopoverTrigger ref={el => { trigger.current = el; }} render={control}
      onPointerDown={() => { pointerFocus.current = true; }}
      onPointerCancel={() => { pointerFocus.current = false; }}
      onClick={() => { pointerFocus.current = false; }}
      onFocus={() => { if (!pointerFocus.current && !restoring.current) setOpen(true); }}
      onBlur={() => { pointerFocus.current = false; restoring.current = false; }} onKeyDown={enterContent} />)}
    <PopoverContent {...position} container={container} className={surface} data-anchor-clipped={clipped || undefined} initialFocus="none" aria-label={popupLabel}><PopoverTitle className="lab-visually-hidden">{popupLabel}</PopoverTitle>{inner}</PopoverContent>
  </Popover>;

  return <SdkTooltip open={open} onOpenChange={(next, details) => {
    if (!next && ((details.reason === 'trigger-hover' && keyboardFocus.current) ||
        (details.reason === 'focus-out' && body.current?.contains(document.activeElement)))) return;
    setOpen(next);
  }} delay={openDelay} closeDelay={140} type="description" closeOnPress={false}>
    {wrap(<TooltipTrigger ref={el => { trigger.current = el; }} render={control} onKeyDown={enterContent}
      onPointerDown={event => {
        pointerFocus.current = document.activeElement !== event.currentTarget;
        keyboardFocus.current = false;
        if (event.pointerType === 'touch' || event.pointerType === 'pen') setOpen(true);
      }}
      onFocus={() => {
        keyboardFocus.current = !pointerFocus.current;
        pointerFocus.current = false;
        setOpen(true);
      }}
      onBlur={event => {
        keyboardFocus.current = false;
        pointerFocus.current = false;
        if (!body.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }} />)}
    <TooltipContent {...position} container={container} className={surface} data-anchor-clipped={clipped || undefined}>{inner}</TooltipContent>
  </SdkTooltip>;
};

export default Tooltip;
