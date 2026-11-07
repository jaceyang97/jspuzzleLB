export const ELEVATOR_DURATION = 15000;

export function elevatorPosition(progress) {
  const t = Math.max(0, Math.min(1, progress));
  const ramp = .2;
  const acceleration = (time) => (time - ramp / Math.PI * Math.sin(Math.PI * time / ramp)) / (2 * (1 - ramp));
  if (t < ramp) return acceleration(t);
  if (t > 1 - ramp) return 1 - acceleration(1 - t);
  return (t - ramp / 2) / (1 - ramp);
}
