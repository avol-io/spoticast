import { useEffect, useState } from 'react';
import { currentPosition } from './playback';
import { usePlayer } from './player-store';

/** Interpolated playback position, re-rendering every half second while playing. */
export function usePlaybackPosition(): number {
  const np = usePlayer((s) => s.nowPlaying);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!np || np.paused) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [np]);
  return np ? currentPosition(np, Math.max(now, np.updatedAt)) : 0;
}
