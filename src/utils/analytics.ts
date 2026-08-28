/**
 * Behavioral analytics built on Vercel Web Analytics custom events.
 *
 * Every event funnels through trackEvent(), which:
 *  - never throws (analytics must never break the app)
 *  - truncates string values to stay within Vercel's payload limits
 *  - enforces a per-session event budget so one visitor can't burn
 *    through the monthly event quota
 *
 * initBehaviorTracking() installs the passive listeners (session start,
 * scroll depth, engagement time, outbound clicks, rage clicks, copies,
 * client errors). Component-level events (theme toggles, searches, modal
 * opens, chart tabs, ...) call trackEvent()/trackOnce() directly.
 */
import { track } from '@vercel/analytics';

type PropValue = string | number | boolean | null;
export type EventProps = Record<string, PropValue>;

const MAX_EVENTS_PER_SESSION = 60;
const MAX_STRING_LENGTH = 100;

let eventsSent = 0;
const sentOnceKeys = new Set<string>();

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const truncate = (value: string, max = MAX_STRING_LENGTH): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const trackEvent = (name: string, props?: EventProps): void => {
  if (!isBrowser || eventsSent >= MAX_EVENTS_PER_SESSION) return;
  eventsSent += 1;
  try {
    const clean: EventProps = {};
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        clean[key] = typeof value === 'string' ? truncate(value) : value;
      }
    }
    track(name, clean);
  } catch {
    // Swallow: tracking failures are never user-visible.
  }
};

/** Fire an event at most once per page session, keyed by `key`. */
export const trackOnce = (key: string, name: string, props?: EventProps): void => {
  if (sentOnceKeys.has(key)) return;
  sentOnceKeys.add(key);
  trackEvent(name, props);
};

// ---------------------------------------------------------------------------
// Session context helpers
// ---------------------------------------------------------------------------

const deviceType = (): string => {
  const w = window.innerWidth;
  if (w <= 640) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
};

const referrerType = (): string => {
  const ref = document.referrer;
  if (!ref) return 'direct';
  try {
    const host = new URL(ref).hostname;
    if (host === window.location.hostname) return 'internal';
    if (/google\.|bing\.|duckduckgo\.|baidu\.|yandex\.|ecosia\./.test(host)) return `search:${host}`;
    if (/twitter\.|(^|\.)x\.com|(^|\.)t\.co$|linkedin\.|facebook\.|reddit\.|ycombinator|instagram\.|weibo\./.test(host)) {
      return `social:${host}`;
    }
    return `other:${host}`;
  } catch {
    return 'unknown';
  }
};

/** Visit counter persisted in localStorage — distinguishes new vs returning visitors. */
const visitInfo = (): { visitNumber: number; returning: boolean } => {
  try {
    const KEY = 'jslb_visit_count';
    const count = (parseInt(localStorage.getItem(KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(KEY, String(count));
    return { visitNumber: Math.min(count, 50), returning: count > 1 };
  } catch {
    return { visitNumber: 1, returning: false };
  }
};

const secondsBucket = (s: number): string => {
  if (s < 10) return '<10s';
  if (s < 30) return '10-30s';
  if (s < 60) return '30-60s';
  if (s < 180) return '1-3m';
  if (s < 600) return '3-10m';
  return '10m+';
};

/** Map a DOM node to the page region it lives in, for click context. */
const AREA_SELECTORS: Array<[selector: string, area: string]> = [
  ['.solver-modal', 'solver-modal'],
  ['.dashboard-header', 'header'],
  ['.new-solvers-banner', 'banner'],
  ['.dashboard-footer', 'footer'],
  ['.charts-container', 'charts'],
  ['.top-solvers-column', 'top-solvers'],
  ['.streaks-column', 'streaks'],
  ['.rising-stars-column', 'rising-stars'],
];

const areaOf = (el: Element): string => {
  for (const [selector, area] of AREA_SELECTORS) {
    if (el.closest(selector)) return area;
  }
  return 'page';
};

const labelOf = (el: Element): string => {
  const label =
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el.textContent || '').trim() ||
    el.getAttribute('class') ||
    el.tagName.toLowerCase();
  return truncate(label.replace(/\s+/g, ' '), 60);
};

// ---------------------------------------------------------------------------
// Passive behavior listeners
// ---------------------------------------------------------------------------

const trackSessionStart = (): void => {
  const { visitNumber, returning } = visitInfo();
  let savedTheme: string;
  try {
    savedTheme = localStorage.getItem('theme') || 'system';
  } catch {
    savedTheme = 'unknown';
  }
  trackEvent('session_start', {
    device: deviceType(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    prefersDark: !!window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    theme: savedTheme,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    lang: navigator.language || 'unknown',
    referrer: referrerType(),
    deepLink: !!new URLSearchParams(window.location.search).get('solver'),
    visitNumber,
    returning,
  });
};

/**
 * Scroll depth milestones. On desktop the dashboard fits in the viewport
 * (no scrolling); on mobile the .dashboard-layout element scrolls, so we
 * listen in the capture phase to catch element-level scroll events too.
 */
const installScrollDepthTracking = (onDepth: (pct: number) => void): void => {
  const milestones = [25, 50, 75, 100];
  const reached = new Set<number>();
  let rafPending = false;

  const measure = (el: Element): number => {
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) return 0;
    return Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100);
  };

  const onScroll = (event: Event) => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const target = event.target as Node;
      let el: Element | null = null;
      if (target === document || target === window as unknown as Node) {
        el = document.scrollingElement;
      } else if (target instanceof Element && target.classList.contains('dashboard-layout')) {
        el = target;
      }
      if (!el) return; // ignore inner table scrolling — covered by table_scroll
      const pct = measure(el);
      onDepth(pct);
      for (const m of milestones) {
        if (pct >= m && !reached.has(m)) {
          reached.add(m);
          trackEvent('scroll_depth', { depth: m, device: deviceType() });
        }
      }
    });
  };

  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
};

/**
 * Engagement summary: foreground time, interaction count, tab switches and
 * max scroll depth. Flushed when the tab is hidden/closed (at most 3 sends
 * per session, and only when at least 5 more seconds have accumulated).
 */
const installEngagementTracking = (getMaxScroll: () => number): void => {
  let activeMs = 0;
  let visibleSince: number | null =
    document.visibilityState === 'visible' ? performance.now() : null;
  let interactions = 0;
  let tabReturns = 0;
  let lastReportedMs = 0;
  let sends = 0;

  const countInteraction = () => {
    interactions += 1;
  };
  document.addEventListener('pointerdown', countInteraction, { capture: true, passive: true });
  document.addEventListener('keydown', countInteraction, { capture: true, passive: true });

  const flush = () => {
    if (visibleSince !== null) {
      activeMs += performance.now() - visibleSince;
      visibleSince = null;
    }
    if (sends >= 3 || activeMs - lastReportedMs < 5000) return;
    sends += 1;
    lastReportedMs = activeMs;
    const seconds = Math.round(activeMs / 1000);
    trackEvent('engagement', {
      seconds,
      timeBucket: secondsBucket(seconds),
      interactions,
      tabReturns,
      maxScrollPct: getMaxScroll(),
      device: deviceType(),
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    } else if (visibleSince === null) {
      visibleSince = performance.now();
      tabReturns += 1;
    }
  });
  window.addEventListener('pagehide', flush);
};

/** Outbound link clicks — GitHub, janestreet.com puzzle links, author site, ... */
const installOutboundClickTracking = (): void => {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!/^https?:/i.test(href)) return;
      try {
        const url = new URL(href);
        if (url.hostname === window.location.hostname) return;
        trackEvent('outbound_click', {
          host: url.hostname,
          path: truncate(url.pathname, 80),
          label: labelOf(anchor),
          area: areaOf(anchor),
        });
      } catch {
        // unparsable href — ignore
      }
    },
    true
  );
};

/**
 * Generic control usage: first click per distinct control per session.
 * Controls with dedicated events (theme toggle, chart tabs, banner dismiss,
 * table rows, links) are excluded to avoid double counting.
 */
const installUiClickTracking = (): void => {
  const EXCLUDED = '.theme-toggle, .segmented-btn, .banner-dismiss, tr, a';
  let uiClicksSent = 0;

  document.addEventListener(
    'click',
    (event) => {
      if (uiClicksSent >= 20) return;
      const target = event.target as Element | null;
      const control = target?.closest?.(
        'button, [role="button"], [role="tab"], input, .legend-item, .intro-button, .banner-more, .solver-stat-info'
      );
      if (!control || control.closest(EXCLUDED)) return;
      const label = labelOf(control);
      const key = `ui:${label}`;
      if (sentOnceKeys.has(key)) return;
      uiClicksSent += 1;
      trackOnce(key, 'ui_click', { target: label, area: areaOf(control) });
    },
    true
  );
};

/** Rage clicks: 4+ rapid clicks clustered in one spot — a frustration signal. */
const installRageClickTracking = (): void => {
  let recent: Array<{ t: number; x: number; y: number }> = [];
  let sends = 0;

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (sends >= 2) return;
      const now = performance.now();
      recent = recent.filter((c) => now - c.t < 900);
      recent.push({ t: now, x: event.clientX, y: event.clientY });
      if (recent.length < 4) return;
      const clustered = recent.every(
        (c) => Math.abs(c.x - recent[0].x) < 28 && Math.abs(c.y - recent[0].y) < 28
      );
      if (!clustered) return;
      sends += 1;
      recent = [];
      const target = event.target as Element | null;
      trackEvent('rage_click', {
        target: target ? labelOf(target) : 'unknown',
        area: target ? areaOf(target) : 'page',
      });
    },
    { capture: true, passive: true }
  );
};

/** Client-side errors, so broken sessions show up in the dashboard. */
const installErrorTracking = (): void => {
  let sends = 0;
  const report = (message: string, source: string) => {
    if (sends >= 3) return;
    if (/ResizeObserver/i.test(message)) return; // benign layout-loop noise
    sends += 1;
    trackEvent('client_error', { message: truncate(message), source: truncate(source, 80) });
  };

  window.addEventListener('error', (event) =>
    report(event.message || 'unknown error', `${event.filename || ''}:${event.lineno || 0}`)
  );
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    report(
      reason instanceof Error ? reason.message : String(reason ?? 'unhandled rejection'),
      'unhandledrejection'
    );
  });
};

/** Copy events — visitors grabbing solver names / stats is an engagement signal. */
const installCopyTracking = (): void => {
  document.addEventListener('copy', () => {
    const selection = window.getSelection?.()?.toString() || '';
    trackOnce('copy', 'copy_text', {
      length: Math.min(selection.length, 5000),
      area: 'page',
    });
  });
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

let initialized = false;

export const initBehaviorTracking = (): void => {
  if (!isBrowser || initialized) return;
  initialized = true;

  let maxScrollPct = 0;
  installScrollDepthTracking((pct) => {
    if (pct > maxScrollPct) maxScrollPct = pct;
  });
  installEngagementTracking(() => maxScrollPct);
  installOutboundClickTracking();
  installUiClickTracking();
  installRageClickTracking();
  installErrorTracking();
  installCopyTracking();

  // Delay session_start until the Vercel Analytics script has been injected
  // by the <Analytics /> component (it mounts in a React effect).
  window.setTimeout(trackSessionStart, 2000);
};
