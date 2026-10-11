import type { SimplifiedEpisode } from '../../lib/spotify/types';
import {
  archiveStatus,
  isArchivedIn,
  useArchiveStore,
  type RemoteArchive,
} from './archive-store';

const ep = (id: string, played = false) =>
  ({
    id,
    uri: `spotify:episode:${id}`,
    name: id,
    duration_ms: 1000,
    resume_point: { fully_played: played, resume_position_ms: 0 },
  }) as SimplifiedEpisode;

describe('archive store', () => {
  beforeEach(() =>
    useArchiveStore.setState({ pending: {}, removed: {}, restored: {} }),
  );

  it('queues unplayed episodes for completion on Spotify', () => {
    useArchiveStore.getState().archive(ep('a'));
    const state = useArchiveStore.getState();
    expect(state.pending.a).toMatchObject({
      uri: 'spotify:episode:a',
      attempts: 0,
    });
    expect(archiveStatus(ep('a'), state)).toBe('pending');
    expect(isArchivedIn(ep('a'), state)).toBe(true);
  });

  it('does not queue episodes Spotify already completed', () => {
    useArchiveStore.getState().archive(ep('a', true));
    expect(useArchiveStore.getState().pending).toEqual({});
  });

  it('restores pending episodes for real and completed ones locally', () => {
    const { archive, restore } = useArchiveStore.getState();
    archive(ep('a'));
    restore(ep('a'));
    restore(ep('b', true));
    const state = useArchiveStore.getState();
    expect(state.pending).toEqual({});
    expect(archiveStatus(ep('a'), state)).toBeNull();
    expect(archiveStatus(ep('b', true), state)).toBe('restored');
    expect(isArchivedIn(ep('b', true), state)).toBe(false);
  });

  it('archiving again clears a local restore', () => {
    const { archive, restore } = useArchiveStore.getState();
    restore(ep('b', true));
    archive(ep('b', true));
    expect(archiveStatus(ep('b', true), useArchiveStore.getState())).toBe(
      'played',
    );
  });

  it('counts attempts and resets them on retry', () => {
    const { archive, markAttempt, retryFailed, markSynced } =
      useArchiveStore.getState();
    archive(ep('a'));
    markAttempt('a');
    markAttempt('a');
    expect(useArchiveStore.getState().pending.a.attempts).toBe(2);
    retryFailed();
    expect(useArchiveStore.getState().pending.a.attempts).toBe(0);
    markSynced('a');
    expect(useArchiveStore.getState().pending).toEqual({});
  });

  describe('sharing through the playlist', () => {
    const remote = (id: string, done = false): RemoteArchive => ({
      id,
      uri: `spotify:episode:${id}`,
      name: id,
      durationMs: 1000,
      archivedAt: 5,
      done,
    });
    const share = (id: string, at: number) =>
      useArchiveStore.setState((s) => ({
        pending: { ...s.pending, [id]: { ...s.pending[id], sharedAt: at } },
      }));

    it('removes from the playlist only what was written there', () => {
      const { archive, restore, markSynced } = useArchiveStore.getState();
      archive(ep('a'));
      archive(ep('b'));
      share('b', 1);
      restore(ep('a'));
      markSynced('b');
      expect(useArchiveStore.getState().removed).toEqual({
        b: 'spotify:episode:b',
      });
    });

    it('archiving again cancels a pending removal and writes it back', () => {
      const { archive, restore } = useArchiveStore.getState();
      archive(ep('a'));
      share('a', 1);
      restore(ep('a'));
      archive(ep('a'));
      const state = useArchiveStore.getState();
      expect(state.removed).toEqual({});
      expect(state.pending.a.sharedAt).toBeNull();
    });

    it('takes in what other devices archived and completed', () => {
      const { archive, applyRemote } = useArchiveStore.getState();
      archive(ep('mine'));
      archive(ep('old'));
      share('old', 100);
      archive(ep('fresh'));
      share('fresh', 2000);
      applyRemote([remote('other'), remote('played', true)], 1000);
      const state = useArchiveStore.getState();
      // Not written yet, or written too recently to show up: kept.
      expect(Object.keys(state.pending).sort()).toEqual([
        'fresh',
        'mine',
        'other',
      ]);
      expect(state.pending.other).toMatchObject({ attempts: 0, sharedAt: 5 });
      // Completed already: leaves the playlist.
      expect(state.removed).toEqual({ played: 'spotify:episode:played' });
      expect(isArchivedIn(ep('other'), state)).toBe(true);
    });

    it('does not bring back what is being removed here', () => {
      const { archive, restore, applyRemote } = useArchiveStore.getState();
      archive(ep('a'));
      share('a', 1);
      restore(ep('a'));
      applyRemote([remote('a')], 1000);
      expect(useArchiveStore.getState().pending).toEqual({});
    });

    it('shares the archive kept by older versions', async () => {
      localStorage.setItem(
        'spoticast.archive',
        JSON.stringify({
          version: 1,
          state: {
            pending: { a: { id: 'a', uri: 'spotify:episode:a', attempts: 1 } },
            restored: {},
          },
        }),
      );
      await useArchiveStore.persist.rehydrate();
      expect(useArchiveStore.getState().pending.a).toMatchObject({
        attempts: 1,
        sharedAt: null,
      });
    });
  });
});
