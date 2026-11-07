import React, { useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export const elevatorMessages = [
  { at: 1000, until: 3500, heading: 'No lateral thinking.', body: 'Just up.' },
  { at: 4000, until: 6500, heading: 'Please refrain from', body: 'jumping to conclusions.' },
  { at: 7000, until: 9500, heading: 'No puzzles', body: 'on this floor.' },
  { at: 10000, until: 14000, heading: 'At last,', body: 'an automatic solution.' },
];

const plaqueClearance = 140;

function findSpace(index) {
  const bottom = window.innerHeight - 24;
  const rails = [...document.querySelectorAll('.central-flow .flow-rail')].filter(element => element.getBoundingClientRect().width > 0);
  const spaces = rails.map(element => {
    const rail = element.getBoundingClientRect();
    const card = element.lastElementChild.getBoundingClientRect();
    return { left: card.left, top: Math.max(rail.bottom, card.bottom) + 24, width: card.width };
  }).filter(space => space.top + plaqueClearance <= bottom);
  if (spaces.length) {
    const space = spaces[index % spaces.length];
    return { ...space, compact: false };
  }
  if (rails.length) return null;
  return { left: 16, bottom: 24, width: Math.min(260, window.innerWidth - 104), compact: true };
}

export default function ElevatorMessages({ message }) {
  const [placement, setPlacement] = useState(null);
  const [shown, setShown] = useState(false);
  const [pastFirstScreen, setPastFirstScreen] = useState(() => window.scrollY > window.innerHeight + plaqueClearance);
  useLayoutEffect(() => {
    let past = window.scrollY > window.innerHeight + plaqueClearance;
    const update = () => {
      const next = window.scrollY > window.innerHeight + plaqueClearance;
      if (next !== past) { past = next; setPastFirstScreen(next); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  useLayoutEffect(() => {
    if (!message) return undefined;
    let visible = false;
    let target = null;
    const scroll = () => {
      const overlapsRail = target && !target.compact && [...document.querySelectorAll('.central-flow .flow-rail')].some(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && target.left < rect.right && target.left + target.width > rect.left && target.top < rect.bottom && target.top + plaqueClearance > rect.top;
      });
      const next = !!target && window.scrollY > window.innerHeight + plaqueClearance && !overlapsRail;
      if (next !== visible) { visible = next; setShown(next); }
    };
    const update = () => {
      target = findSpace(elevatorMessages.indexOf(message));
      setPlacement(target);
      scroll();
    };
    setShown(false);
    update();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('resize', update); };
  }, [message]);
  if (!pastFirstScreen || !shown) return null;
  return <div className="flow-elevator-asides" aria-hidden="true">
    <AnimatePresence>
      {message && placement && <motion.div key={message.at} className={`flow-elevator-note${placement.compact ? ' flow-elevator-note--compact' : ''}`} style={{ left: placement.left, top: placement.top, bottom: placement.bottom, width: placement.width }} initial={{ opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .99, transition: { duration: .18, ease: [.4, 0, 1, 1] } }} transition={{ duration: .24, ease: [.215, .61, .355, 1] }}>
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true"><path d="M9 18V2M3 8L9 2L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
        <span className="flow-elevator-divider" />
        <span className="flow-elevator-copy"><span className="flow-elevator-heading">{message.heading}</span><span className="flow-elevator-body">{message.body}</span></span>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
