// Golden-angle spacing keeps consecutive PIDs far apart on the color wheel; cycling the
// lightness separates PIDs whose hues still land close together.
const GOLDEN_ANGLE_DEGREES = 137.508;
const FULL_TURN_DEGREES = 360;
const LIGHTNESS_LEVELS = [52, 64, 76] as const;

/** Stable color for a process, so it looks the same in every view. */
export function pidColor(pid: number): string {
  const hue = (pid * GOLDEN_ANGLE_DEGREES) % FULL_TURN_DEGREES;
  const lightness = LIGHTNESS_LEVELS[pid % LIGHTNESS_LEVELS.length];
  return `hsl(${hue} 65% ${lightness}%)`;
}