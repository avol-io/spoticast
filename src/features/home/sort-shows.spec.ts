import type {
  Paging,
  SavedShow,
  SimplifiedEpisode,
} from '../../lib/spotify/types';
import { sortShows } from './sort-shows';

const saved = (id: string, name: string, addedAt = '2024-01-01T00:00:00Z') =>
  ({ added_at: addedAt, show: { id, name } }) as SavedShow;
const page = (releaseDate: string) =>
  ({
    items: [{ release_date: releaseDate } as SimplifiedEpisode],
    next: null,
  }) as unknown as Paging<SimplifiedEpisode>;

const shows = [
  saved('a', 'Zeta'),
  saved('b', 'alfa'),
  saved('c', 'Beta', '2024-06-01T00:00:00Z'),
];
const latest = new Map([
  ['a', page('2024-05-10')],
  ['b', page('2024-05-20')],
  ['c', undefined],
]);
const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe('sortShows', () => {
  it('sorts by latest episode, falling back to the follow date', () => {
    expect(ids(sortShows(shows, 'latest', latest, []))).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('sorts by name ignoring case', () => {
    expect(ids(sortShows(shows, 'alpha', latest, [], 'en'))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('keeps the manual order and appends unplaced shows by latest', () => {
    expect(ids(sortShows(shows, 'manual', latest, ['a', 'gone']))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });
});
