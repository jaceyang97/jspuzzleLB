export const ELEVATOR_MIX_GAIN = .9;
export const ELEVATOR_ARRIVAL_GAP = .12;
export const ELEVATOR_DING_ADVANCE = .5;
export const ELEVATOR_MUSIC_URL = new URL('./assets/elevator-swing-piano-wink.mp3', import.meta.url).href;
export const ELEVATOR_DING_URL = new URL('./assets/elevator-ding-soundjay-recorded.mp3', import.meta.url).href;

function audioPreloader(url) {
  let data;
  return () => {
    if (!data) {
      data = fetch(url).then(response => {
        if (!response.ok) throw new Error(`Elevator audio request failed: ${response.status}`);
        return response.arrayBuffer();
      }).catch(error => { data = undefined; throw error; });
    }
    return data;
  };
}

export const preloadElevatorMusic = audioPreloader(ELEVATOR_MUSIC_URL);
export const preloadArrivalChime = audioPreloader(ELEVATOR_DING_URL);

export function preloadElevatorAudio() {
  return Promise.all([preloadElevatorMusic(), preloadArrivalChime()]);
}

export function scheduleArrivalChime(context, destination, buffer, when) {
  const source = context.createBufferSource();
  const level = context.createGain();
  level.gain.value = .25;
  source.buffer = buffer;
  source.connect(level);
  level.connect(destination);
  source.start(when);
  return { source, startedAt: when, duration: buffer.duration };
}

export function scheduleElevatorMusic(context, destination, buffer, beginning) {
  const duration = buffer.duration;
  const music = context.createGain();
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(music);
  music.connect(destination);
  music.gain.setValueAtTime(0, beginning);
  music.gain.linearRampToValueAtTime(1, beginning + .15);
  music.gain.setValueAtTime(1, beginning + duration - .02);
  music.gain.linearRampToValueAtTime(0, beginning + duration);
  source.start(beginning);
  return { gain: music.gain, source, startedAt: beginning, duration };
}

function outputTime(context) {
  const timestamp = context.getOutputTimestamp?.();
  if (timestamp?.performanceTime > 0) {
    return Math.min(context.currentTime, timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000);
  }
  return Math.max(0, context.currentTime - (context.baseLatency || 0) - (context.outputLatency || 0));
}

export default function createElevatorSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = ELEVATOR_MIX_GAIN;
  master.connect(context.destination);
  let music;
  let arrivalChime;
  let closed = false;
  let stopping = false;
  let arrived = false;
  let closeTimer;

  const stop = () => {
    if (closed || stopping) return;
    stopping = true;
    window.clearTimeout(closeTimer);
    const now = context.currentTime;
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + .06);
    music?.source.stop(now > music.startedAt ? now + .06 : now);
    arrivalChime?.source.stop(now > arrivalChime.startedAt ? now + .06 : now);
    closeTimer = window.setTimeout(() => { closed = true; context.close(); }, 80);
  };

  const start = () => {
    return Promise.all([context.resume(), preloadElevatorAudio()]).then(async ([, data]) => {
      if (closed || stopping) return null;
      const [buffer, chimeBuffer] = await Promise.all(data.map(bytes => context.decodeAudioData(bytes.slice(0))));
      if (closed || stopping) return null;
      music = scheduleElevatorMusic(context, master, buffer, context.currentTime + .04);
      let progress = 0;
      return {
        duration: music.duration * 1000,
        getProgress: () => {
          if (context.state === 'running') {
            const audibleTime = outputTime(context);
            const elapsed = Math.max(0, audibleTime - music.startedAt);
            progress = Math.max(progress, Math.min(1, elapsed / music.duration));
            if (!arrivalChime && !stopping && elapsed >= .1) {
              const outputDelay = Math.max(0, context.currentTime - audibleTime);
              const chimeTime = music.startedAt + music.duration + outputDelay + ELEVATOR_ARRIVAL_GAP - ELEVATOR_DING_ADVANCE;
              arrivalChime = scheduleArrivalChime(context, master, chimeBuffer, Math.max(context.currentTime, chimeTime));
            }
          }
          return progress;
        },
      };
    });
  };

  const arrive = () => {
    if (closed || stopping || arrived) return;
    arrived = true;
    const now = context.currentTime;
    music?.gain.cancelScheduledValues(now);
    music?.gain.setTargetAtTime(0, now, .04);
    const remaining = Math.max(0, arrivalChime.startedAt + arrivalChime.duration - now);
    closeTimer = window.setTimeout(stop, (remaining + .1) * 1000);
  };

  return { start, arrive, stop };
}
