import type { PendingArchive } from './archive-store';
import { syncNextArchived, type ArchiveSyncDeps } from './archive-sync';

const pending = (id: string, attempts = 0): PendingArchive => ({
  id,
  uri: `spotify:episode:${id}`,
  name: id,
  durationMs: 600_000,
  archivedAt: 0,
  attempts,
});

function deps(overrides: Partial<ArchiveSyncDeps> = {}) {
  const calls: string[] = [];
  const d: ArchiveSyncDeps = {
    pending: () => [pending('a')],
    isIdle: async () => true,
    snapshot: () => ({
      contextUri: 'spotify:playlist:q',
      uri: 'spotify:episode:cur',
      positionMs: 42,
    }),
    getVolume: async () => 0.8,
    setVolume: async (v) => void calls.push(`volume ${v}`),
    playSilently: async (uri, pos) => void calls.push(`play ${uri} @${pos}`),
    waitForEnd: async () => void calls.push('wait'),
    pause: async () => void calls.push('pause'),
    restore: async (s) => void calls.push(`restore ${s.uri} @${s.positionMs}`),
    verify: async () => true,
    markSynced: (id) => void calls.push(`synced ${id}`),
    markAttempt: (id) => void calls.push(`attempt ${id}`),
    aborted: () => false,
    setSyncing: (s) => void calls.push(`syncing ${s}`),
    ...overrides,
  };
  return { d, calls };
}

describe('syncNextArchived', () => {
  it('does nothing without pending episodes', async () => {
    const { d, calls } = deps({ pending: () => [] });
    expect(await syncNextArchived(d)).toBe('idle');
    expect(calls).toEqual([]);
  });

  it('waits while something is playing', async () => {
    const { d, calls } = deps({ isIdle: async () => false });
    expect(await syncNextArchived(d)).toBe('busy');
    expect(calls).toEqual([]);
  });

  it('plays the tail silently, restores the previous state and the volume', async () => {
    const { d, calls } = deps();
    expect(await syncNextArchived(d)).toBe('synced');
    expect(calls).toEqual([
      'syncing true',
      'volume 0',
      'play spotify:episode:a @597000',
      'wait',
      'pause',
      'restore spotify:episode:cur @42',
      'volume 0.8',
      'syncing false',
      'synced a',
    ]);
  });

  it('skips the restore when nothing was loaded', async () => {
    const { d, calls } = deps({ snapshot: () => null });
    await syncNextArchived(d);
    expect(calls.some((c) => c.startsWith('restore'))).toBe(false);
  });

  it('counts a failed attempt when Spotify does not confirm', async () => {
    const { d, calls } = deps({ verify: async () => false });
    expect(await syncNextArchived(d)).toBe('retry');
    expect(calls.at(-1)).toBe('attempt a');
  });

  it('counts an attempt and restores the volume when playback fails', async () => {
    const { d, calls } = deps({
      playSilently: async () => {
        throw new Error('403');
      },
      verify: async () => false,
    });
    expect(await syncNextArchived(d)).toBe('retry');
    expect(calls).toContain('volume 0.8');
  });

  it('gives the player back to the user when aborted', async () => {
    const { d, calls } = deps({ aborted: () => true });
    expect(await syncNextArchived(d)).toBe('aborted');
    expect(calls).not.toContain('pause');
    expect(calls.some((c) => c.startsWith('restore'))).toBe(false);
    expect(calls).toContain('volume 0.8');
  });

  it('skips episodes that ran out of attempts', async () => {
    const { d } = deps({ pending: () => [pending('a', 3)] });
    expect(await syncNextArchived(d)).toBe('idle');
  });
});
