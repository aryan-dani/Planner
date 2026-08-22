export const PLAYBACK_SPEED_MIN_MS = 50;
export const PLAYBACK_SPEED_MAX_MS = 3000;
export const PLAYBACK_SPEED_DEFAULT_MS = 250;
export const PLAYBACK_SPEED_STEP_MS = 25;

export const PLAYBACK_SPEED_PRESETS = [
  { label: "Super slow", ms: 2000 },
  { label: "Slow", ms: 750 },
  { label: "Normal", ms: 250 },
  { label: "Fast", ms: 80 },
] as const;

export function formatPlaybackSpeed(ms: number): string {
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return seconds % 1 === 0 ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  return `${ms}ms`;
}

/** Map delay to slider position: left = super slow, right = fast. */
export function speedMsToSliderValue(ms: number): number {
  return PLAYBACK_SPEED_MAX_MS + PLAYBACK_SPEED_MIN_MS - ms;
}

export function sliderValueToSpeedMs(value: number): number {
  return PLAYBACK_SPEED_MAX_MS + PLAYBACK_SPEED_MIN_MS - value;
}

export function speedFillPercent(ms: number): number {
  const span = PLAYBACK_SPEED_MAX_MS - PLAYBACK_SPEED_MIN_MS;
  if (span <= 0) return 0;
  return ((PLAYBACK_SPEED_MAX_MS - ms) / span) * 100;
}
