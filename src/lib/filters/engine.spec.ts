import type { SimplifiedEpisode } from '../spotify/types';
import {
  emptyCriteria,
  isEmptyCriteria,
  matchesCriteria,
  sortEpisodes,
  type FilterCriteria,
} from './engine';

const now = new Date(2024, 4, 20, 18);
const ep = (overrides: Partial<SimplifiedEpisode> = {}) =>
  ({
    id: 'e',
    name: 'Intervista con un astronauta',
    description: 'Parliamo di Marte e della Luna',
    duration_ms: 30 * 60_000,
    release_date: '2024-05-18',
    resume_point: { fully_played: false, resume_position_ms: 0 },
    ...overrides,
  }) as SimplifiedEpisode;
const criteria = (c: Partial<FilterCriteria>) => ({ ...emptyCriteria, ...c });
const match = (
  e: SimplifiedEpisode,
  c: Partial<FilterCriteria>,
  show?: { media_type: string },
) => matchesCriteria(e, criteria(c), { now, show });

describe('matchesCriteria', () => {
  it('matches everything with empty criteria', () => {
    expect(isEmptyCriteria(emptyCriteria)).toBe(true);
    expect(match(ep(), {})).toBe(true);
  });

  it('filters by duration bounds (inclusive)', () => {
    expect(match(ep(), { minMinutes: 30 })).toBe(true);
    expect(match(ep(), { minMinutes: 31 })).toBe(false);
    expect(match(ep(), { maxMinutes: 30 })).toBe(true);
    expect(match(ep(), { maxMinutes: 20 })).toBe(false);
    expect(match(ep(), { minMinutes: 10, maxMinutes: 45 })).toBe(true);
  });

  it('filters by publication in the last N days', () => {
    expect(match(ep({ release_date: '2024-05-20' }), { withinDays: 1 })).toBe(
      true,
    );
    expect(match(ep({ release_date: '2024-05-19' }), { withinDays: 1 })).toBe(
      false,
    );
    expect(match(ep({ release_date: '2024-05-14' }), { withinDays: 7 })).toBe(
      true,
    );
    expect(match(ep({ release_date: '2024-05-13' }), { withinDays: 7 })).toBe(
      false,
    );
  });

  it('filters by listening status', () => {
    const started = ep({
      resume_point: { fully_played: false, resume_position_ms: 60_000 },
    });
    const played = ep({
      resume_point: { fully_played: true, resume_position_ms: 0 },
    });
    expect(match(ep(), { status: 'not-started' })).toBe(true);
    expect(match(started, { status: 'not-started' })).toBe(false);
    expect(match(played, { status: 'not-started' })).toBe(false);
    expect(match(started, { status: 'in-progress' })).toBe(true);
    expect(match(ep(), { status: 'in-progress' })).toBe(false);
    expect(match(played, { status: 'in-progress' })).toBe(false);
  });

  it('searches title and description ignoring case and accents', () => {
    expect(match(ep(), { text: 'ASTRONAUTA' })).toBe(true);
    expect(match(ep(), { text: 'marte' })).toBe(true);
    expect(match(ep({ name: 'Perché sì' }), { text: 'perche' })).toBe(true);
    expect(match(ep(), { text: 'giove' })).toBe(false);
  });

  it('keeps only video podcasts when asked', () => {
    expect(match(ep(), { videoOnly: true }, { media_type: 'mixed' })).toBe(
      true,
    );
    expect(match(ep(), { videoOnly: true }, { media_type: 'audio' })).toBe(
      false,
    );
  });
});

describe('sortEpisodes', () => {
  const items = [
    { episode: ep({ id: 'a', release_date: '2024-05-01', duration_ms: 3 }) },
    { episode: ep({ id: 'b', release_date: '2024-05-10', duration_ms: 1 }) },
    { episode: ep({ id: 'c', release_date: '2024-04-01', duration_ms: 2 }) },
  ];
  const ids = (list: typeof items) => list.map((i) => i.episode.id);

  it('sorts by date and duration', () => {
    expect(ids(sortEpisodes(items, 'newest'))).toEqual(['b', 'a', 'c']);
    expect(ids(sortEpisodes(items, 'oldest'))).toEqual(['c', 'a', 'b']);
    expect(ids(sortEpisodes(items, 'shortest'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortEpisodes(items, 'longest'))).toEqual(['a', 'c', 'b']);
  });
});
