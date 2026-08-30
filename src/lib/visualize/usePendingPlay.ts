"use client";

import { useEffect, useState } from "react";
import type { PlaybackControls } from "@/lib/visualize/useVisualizerPlayback";

/** Auto-starts playback after steps are generated (shared across workspaces). */
export function usePendingPlay<TState>(
  steps: unknown[],
  playback: PlaybackControls<TState>,
) {
  const [pendingPlay, setPendingPlay] = useState(false);
  const play = playback.play;

  useEffect(() => {
    if (!pendingPlay || steps.length === 0) return;
    play();
    // Reset after play is scheduled; avoids stale re-triggers on the same step batch.
    const id = requestAnimationFrame(() => setPendingPlay(false));
    return () => cancelAnimationFrame(id);
  }, [pendingPlay, steps.length, play]);

  return { pendingPlay, setPendingPlay };
}
