import { useCallback, useEffect, useRef, useState } from 'react';
import Elevator from './vendor/elevator';
import createElevatorSound from './elevatorSound';
import { ELEVATOR_DURATION, elevatorPosition } from './elevatorMotion';
import { elevatorMessages } from './ElevatorMessages';

const scrollKeys = new Set(['Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export default function useElevator(onArrival) {
  const [riding, setRiding] = useState(false);
  const [departed, setDeparted] = useState(false);
  const [message, setMessage] = useState(null);
  const active = useRef(false);
  const currentElevator = useRef(null);
  const cleanup = useRef(() => {});
  const arrival = useRef(onArrival);
  arrival.current = onArrival;
  useEffect(() => () => cleanup.current(), []);
  const adjustForLayoutShift = useCallback(offset => currentElevator.current?.adjustPosition(offset), []);

  const elevate = useCallback(() => {
    if (active.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) { arrival.current(); return; }
    cleanup.current();
    const sound = createElevatorSound();
    if (!sound) { arrival.current(); return; }
    const removeListeners = [];
    let elevator;
    let currentMessage = null;
    let started = false;
    let stopped = false;
    const release = (stopSound = true) => {
      stopped = true;
      removeListeners.forEach((remove) => remove());
      elevator?.destroy();
      if (currentElevator.current === elevator) currentElevator.current = null;
      if (stopSound) sound.stop();
      active.current = false;
      cleanup.current = () => {};
    };
    const cancel = () => { release(); setMessage(null); setRiding(false); setDeparted(false); };
    const keydown = (event) => {
      if (!scrollKeys.has(event.key)) return;
      if (event.key === 'Escape') event.preventDefault();
      cancel();
    };
    const visibility = () => { if (document.hidden) cancel(); };
    const motionChange = () => { if (reducedMotion.matches) { cancel(); arrival.current(); } };
    const listen = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      removeListeners.push(() => target.removeEventListener(event, handler, options));
    };
    listen(window, 'wheel', cancel, { passive: true });
    listen(window, 'touchstart', cancel, { passive: true });
    listen(window, 'pointerdown', cancel, { passive: true });
    listen(window, 'keydown', keydown);
    listen(window, 'blur', cancel);
    listen(document, 'visibilitychange', visibility);
    listen(reducedMotion, 'change', motionChange);
    active.current = true;
    setRiding(true);
    cleanup.current = () => release();
    const unavailable = () => {
      if (stopped) return;
      release(); setMessage(null); setRiding(false); setDeparted(false); arrival.current();
    };
    sound.start().then(playback => {
      if (stopped) return;
      if (!playback) { unavailable(); return; }
      elevator = new Elevator({
        duration: playback.duration,
        playbackProgress: playback.getProgress,
        easing: (time, start, distance, duration) => start + distance * elevatorPosition(time / duration),
        updateCallback: (progress) => {
          if (!started && progress > 0) { started = true; setDeparted(true); }
          const elapsed = progress * ELEVATOR_DURATION;
          const next = elevatorMessages.find(item => elapsed >= item.at && elapsed < item.until) || null;
          if (next !== currentMessage) { currentMessage = next; setMessage(next); }
        },
        endCallback: () => {
          release(false);
          setMessage(null);
          setRiding(false);
          setDeparted(false);
          arrival.current();
          sound.arrive();
          cleanup.current = () => sound.stop();
        },
      });
      currentElevator.current = elevator;
      elevator.elevate();
    }).catch(unavailable);
  }, []);

  return { riding, departed, elevate, message, adjustForLayoutShift };
}
