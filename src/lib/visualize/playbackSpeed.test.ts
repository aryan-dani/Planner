import { describe, expect, it } from "vitest";
import {
  formatPlaybackSpeed,
  speedMsToSliderValue,
  sliderValueToSpeedMs,
  speedFillPercent,
  PLAYBACK_SPEED_MIN_MS,
  PLAYBACK_SPEED_MAX_MS,
  PLAYBACK_SPEED_DEFAULT_MS,
} from "@/lib/visualize/playbackSpeed";

describe("formatPlaybackSpeed", () => {
  it("formats ms and seconds", () => {
    expect(formatPlaybackSpeed(250)).toBe("250ms");
    expect(formatPlaybackSpeed(1000)).toBe("1s");
    expect(formatPlaybackSpeed(1500)).toBe("1.5s");
  });
});

describe("speedMsToSliderValue", () => {
  it("round-trips with sliderValueToSpeedMs", () => {
    for (const ms of [
      PLAYBACK_SPEED_MIN_MS,
      PLAYBACK_SPEED_DEFAULT_MS,
      PLAYBACK_SPEED_MAX_MS,
      750,
    ]) {
      expect(sliderValueToSpeedMs(speedMsToSliderValue(ms))).toBe(ms);
    }
  });
});

describe("speedFillPercent", () => {
  it("maps delay to fill percent", () => {
    expect(speedFillPercent(PLAYBACK_SPEED_MAX_MS)).toBe(0);
    expect(speedFillPercent(PLAYBACK_SPEED_MIN_MS)).toBe(100);
    expect(speedFillPercent(PLAYBACK_SPEED_DEFAULT_MS)).toBeCloseTo(
      ((PLAYBACK_SPEED_MAX_MS - PLAYBACK_SPEED_DEFAULT_MS) /
        (PLAYBACK_SPEED_MAX_MS - PLAYBACK_SPEED_MIN_MS)) *
        100,
    );
  });
});
