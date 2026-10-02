import { MAX_ARCHIVE_ATTEMPTS, type PendingArchive } from './archive-store';

/** How many ms before the end playback starts when forcing completion. */
export const TAIL_MS = 3000;

export interface Snapshot {
  /** What to put back once done (null: nothing was loaded). */
  contextUri: string | null;
  uri: string;
  positionMs: number;
}

/** Everything the sync touches, injected so the state machine is testable. */
export interface ArchiveSyncDeps {
  pending: () => PendingArchive[];
  /** True when nothing plays anywhere and the in-browser player is ready. */
  isIdle: () => Promise<boolean>;
  snapshot: () => Snapshot | null;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  /** Plays `uri` from `positionMs` on this browser. */
  playSilently: (uri: string, positionMs: number) => Promise<void>;
  /** Resolves when `uri` reaches its end (or after `timeoutMs`). */
  waitForEnd: (uri: string, timeoutMs: number) => Promise<void>;
  pause: () => Promise<void>;
  /** Loads the snapshot back, paused, on this browser. */
  restore: (snapshot: Snapshot) => Promise<void>;
  /** Asks Spotify whether the episode now counts as completed. */
  verify: (id: string) => Promise<boolean>;
  markSynced: (id: string) => void;
  markAttempt: (id: string) => void;
  /** True once the user started doing something with the player. */
  aborted: () => boolean;
  setSyncing: (syncing: boolean) => void;
}

export type SyncResult = 'idle' | 'busy' | 'synced' | 'retry' | 'aborted';

/**
 * Forces Spotify to mark one archived episode as completed: with the volume
 * at 0 it plays the last seconds on this browser, puts back what was loaded
 * before and checks the resume point. Runs only while playback is stopped.
 */
export async function syncNextArchived(
  deps: ArchiveSyncDeps,
): Promise<SyncResult> {
  const next = deps.pending().find((p) => p.attempts < MAX_ARCHIVE_ATTEMPTS);
  if (!next) return 'idle';
  if (!(await deps.isIdle())) return 'busy';

  const snapshot = deps.snapshot();
  const volume = await deps.getVolume();
  deps.setSyncing(true);
  let aborted = false;
  try {
    await deps.setVolume(0);
    await deps.playSilently(next.uri, Math.max(0, next.durationMs - TAIL_MS));
    await deps.waitForEnd(next.uri, TAIL_MS + 9000);
    aborted = deps.aborted();
    if (!aborted) {
      await deps.pause();
      if (snapshot) await deps.restore(snapshot);
    }
  } catch {
    // Counted as a failed attempt below.
  } finally {
    await deps.setVolume(volume).catch(() => undefined);
    deps.setSyncing(false);
  }
  if (aborted) return 'aborted';

  if (await deps.verify(next.id).catch(() => false)) {
    deps.markSynced(next.id);
    return 'synced';
  }
  deps.markAttempt(next.id);
  return 'retry';
}
