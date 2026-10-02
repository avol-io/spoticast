import { emptyCriteria } from '../../lib/filters/engine';
import * as endpoints from '../../lib/spotify/endpoints';
import type {
  Paging,
  SimplifiedEpisode,
  SimplifiedShow,
} from '../../lib/spotify/types';
import { useFilters, type SmartList } from '../../lib/storage/filters';
import { queryClient } from '../../lib/query/query-client';
import { libraryKeys } from '../library/queries';
import { selectSmartEpisodes, syncSmartPlaylist } from './smart-lists';

const show = (id: string, media_type = 'audio') =>
  ({ id, name: id, media_type }) as SimplifiedShow;
const ep = (id: string, date: string, minutes: number, played = false) =>
  ({
    id,
    uri: `spotify:episode:${id}`,
    name: id,
    description: '',
    release_date: date,
    duration_ms: minutes * 60_000,
    resume_point: { fully_played: played, resume_position_ms: 0 },
  }) as SimplifiedEpisode;
const page = (...items: SimplifiedEpisode[]) =>
  ({ items, next: null }) as unknown as Paging<SimplifiedEpisode>;

const list: SmartList = {
  id: 'l1',
  name: 'Quick',
  criteria: { ...emptyCriteria, maxMinutes: 30 },
  showIds: null,
  includeArchived: false,
  sort: 'newest',
  spotifyPlaylist: true,
  playlistId: null,
  playlistName: null,
};

describe('selectSmartEpisodes', () => {
  const shows = [show('s1'), show('s2')];
  const pages = [
    page(ep('a', '2024-05-01', 20), ep('b', '2024-05-03', 50)),
    page(ep('c', '2024-05-05', 10, true), ep('d', '2024-05-04', 25)),
  ];
  const isArchived = (e: SimplifiedEpisode) => !!e.resume_point?.fully_played;

  it('merges shows, applies criteria, hides archived and sorts', () => {
    const result = selectSmartEpisodes(list, shows, pages, isArchived);
    expect(result.map((e) => e.id)).toEqual(['d', 'a']);
    expect(result[0].show.id).toBe('s2');
  });

  it('can include archived episodes', () => {
    const result = selectSmartEpisodes(
      { ...list, includeArchived: true },
      shows,
      pages,
      isArchived,
    );
    expect(result.map((e) => e.id)).toEqual(['c', 'd', 'a']);
  });
});

describe('syncSmartPlaylist', () => {
  beforeEach(() => {
    useFilters.setState({ smartLists: [list] });
    queryClient.setQueryData(libraryKeys.savedShows, [
      { added_at: '', show: show('s1') },
    ]);
    queryClient.setQueryData(
      libraryKeys.latestEpisodes('s1'),
      page(ep('a', '2024-05-01', 20), ep('b', '2024-05-02', 50)),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('creates "Spoticast - <name>" and replaces its content', async () => {
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([]);
    const create = vi
      .spyOn(endpoints, 'createPlaylist')
      .mockResolvedValue({ id: 'pl' } as never);
    const replace = vi
      .spyOn(endpoints, 'replacePlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    await syncSmartPlaylist(list);
    expect(create).toHaveBeenCalledWith(
      'Spoticast - Quick',
      expect.any(String),
    );
    expect(replace).toHaveBeenCalledWith('pl', ['spotify:episode:a']);
    expect(useFilters.getState().smartLists[0]).toMatchObject({
      playlistId: 'pl',
      playlistName: 'Spoticast - Quick',
    });
  });

  it('renames the existing playlist after the list was renamed', async () => {
    vi.spyOn(endpoints, 'libraryContains').mockResolvedValue([true]);
    const rename = vi
      .spyOn(endpoints, 'updatePlaylistDetails')
      .mockResolvedValue();
    vi.spyOn(endpoints, 'replacePlaylistItems').mockResolvedValue({
      snapshot_id: 's',
    });
    await syncSmartPlaylist({
      ...list,
      name: 'Short',
      playlistId: 'pl',
      playlistName: 'Spoticast - Quick',
    });
    expect(rename).toHaveBeenCalledWith('pl', { name: 'Spoticast - Short' });
  });

  it('retries when a shared request is cancelled by an unmounting screen', async () => {
    queryClient.removeQueries({ queryKey: libraryKeys.latestEpisodes('s1') });
    vi.spyOn(endpoints, 'getMe').mockResolvedValue({ id: 'me' } as never);
    vi.spyOn(endpoints, 'getMyPlaylists').mockResolvedValue([]);
    vi.spyOn(endpoints, 'createPlaylist').mockResolvedValue({
      id: 'pl',
    } as never);
    const replace = vi
      .spyOn(endpoints, 'replacePlaylistItems')
      .mockResolvedValue({ snapshot_id: 's' });
    let calls = 0;
    vi.spyOn(endpoints, 'getShowEpisodes').mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        // Simulate the UI observer unmounting mid-request.
        setTimeout(
          () =>
            void queryClient.cancelQueries({
              queryKey: libraryKeys.latestEpisodes('s1'),
            }),
          0,
        );
        await new Promise((r) => setTimeout(r, 20));
      }
      return page(ep('a', '2024-05-01', 20));
    });
    await syncSmartPlaylist(list);
    expect(replace).toHaveBeenCalledWith('pl', ['spotify:episode:a']);
  });

  it('does nothing when the playlist option is off', async () => {
    const replace = vi.spyOn(endpoints, 'replacePlaylistItems');
    await syncSmartPlaylist({ ...list, spotifyPlaylist: false });
    expect(replace).not.toHaveBeenCalled();
  });
});
