import type { SimplifiedEpisode } from './spotify/types';
import {
  episodeProgress,
  formatClock,
  formatDuration,
  formatReleaseDate,
  isVideoShow,
  pickImage,
  releaseDate,
} from './episodes';

const episode = (overrides: Partial<SimplifiedEpisode> = {}) =>
  ({
    id: 'e1',
    duration_ms: 60 * 60_000,
    release_date: '2024-05-17',
    release_date_precision: 'day',
    ...overrides,
  }) as SimplifiedEpisode;

describe('episode helpers', () => {
  it('parses every release date precision', () => {
    expect(releaseDate(episode()).toDateString()).toBe(
      new Date(2024, 4, 17).toDateString(),
    );
    expect(releaseDate(episode({ release_date: '2024-05' })).getDate()).toBe(1);
    expect(releaseDate(episode({ release_date: '2024' })).getMonth()).toBe(0);
  });

  it('computes progress from the resume point', () => {
    expect(episodeProgress(episode())).toEqual({
      started: false,
      fraction: 0,
      remainingMs: 3_600_000,
    });
    expect(
      episodeProgress(
        episode({
          resume_point: { fully_played: false, resume_position_ms: 900_000 },
        }),
      ),
    ).toEqual({ started: true, fraction: 0.25, remainingMs: 2_700_000 });
    expect(
      episodeProgress(
        episode({
          resume_point: { fully_played: true, resume_position_ms: 0 },
        }),
      ).fraction,
    ).toBe(1);
  });

  it('formats durations and clocks', () => {
    expect(formatDuration(45 * 60_000, 'en')).toBe('45m');
    expect(formatDuration(65 * 60_000, 'en')).toBe('1h 5m');
    expect(formatDuration(120 * 60_000, 'en')).toBe('2h');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_723_000)).toBe('1:02:03');
  });

  it('formats recent dates relatively and older ones absolutely', () => {
    const now = new Date(2024, 4, 20, 15);
    expect(formatReleaseDate(new Date(2024, 4, 20), 'en', now)).toBe('today');
    expect(formatReleaseDate(new Date(2024, 4, 17), 'en', now)).toBe(
      '3 days ago',
    );
    expect(formatReleaseDate(new Date(2024, 3, 2), 'en', now)).toBe('Apr 2');
    expect(formatReleaseDate(new Date(2023, 3, 2), 'en', now)).toBe(
      'Apr 2, 2023',
    );
  });

  it('flags video shows from media_type', () => {
    expect(isVideoShow({ media_type: 'audio' })).toBe(false);
    expect(isVideoShow({ media_type: 'mixed' })).toBe(true);
  });

  it('picks a large enough image', () => {
    const images = [
      { url: 'big', width: 640 },
      { url: 'mid', width: 300 },
      { url: 'small', width: 64 },
    ];
    expect(pickImage(images, 200)).toBe('mid');
    expect(pickImage(images, 1000)).toBe('big');
    expect(pickImage([])).toBeUndefined();
  });
});
