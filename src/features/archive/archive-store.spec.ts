import type { SimplifiedEpisode } from '../../lib/spotify/types';
import { archiveStatus, isArchivedIn, useArchiveStore } from './archive-store';

const ep = (id: string, played = false) =>
  ({
    id,
    uri: `spotify:episode:${id}`,
    name: id,
    duration_ms: 1000,
    resume_point: { fully_played: played, resume_position_ms: 0 },
  }) as SimplifiedEpisode;

describe('archive store', () => {
  beforeEach(() => useArchiveStore.setState({ pending: {}, restored: {} }));

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
});
