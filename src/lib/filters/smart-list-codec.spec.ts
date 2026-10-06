import type { SmartList } from '../storage/filters';
import { emptyCriteria } from './engine';
import {
  decodeDescription,
  describeSmartList,
  encodeSmartList,
  MAX_DESCRIPTION,
  resolveShowIds,
  shouldWriteDescription,
} from './smart-list-codec';

const showId = (n: number) => `${String(n).padStart(5, '0')}abcdefghijklmnopq`;

const list: Pick<
  SmartList,
  'criteria' | 'showIds' | 'includeArchived' | 'sort' | 'updatedAt'
> = {
  criteria: {
    ...emptyCriteria,
    maxMinutes: 30,
    withinDays: 7,
    status: 'not-started',
    text: 'caffè "news"',
    videoOnly: true,
  },
  showIds: [showId(1), showId(2)],
  includeArchived: true,
  sort: 'shortest',
  updatedAt: 1_760_000_000_000,
};

describe('smart list codec', () => {
  it('round-trips a config through the description', () => {
    const description = encodeSmartList(list);
    expect(description).toMatch(/^Spoticast smart filter · sc1:[\w-]+$/);
    expect(decodeDescription(description)).toEqual({
      kind: 'valid',
      updatedAt: list.updatedAt,
      config: {
        criteria: list.criteria,
        showIds: ['00001', '00002'],
        includeArchived: true,
        sort: 'shortest',
      },
    });
  });

  it('keeps "every podcast" apart from an explicit choice', () => {
    const decoded = decodeDescription(
      encodeSmartList({ ...list, showIds: null }),
    );
    expect(decoded.kind === 'valid' && decoded.config.showIds).toBeNull();
  });

  it('reads descriptions that Spotify returns HTML-escaped', () => {
    const description = encodeSmartList(list)?.replace(
      'Spoticast',
      '&lt;b&gt;Spoticast&#x2F;',
    );
    expect(decodeDescription(description).kind).toBe('valid');
  });

  it('tells missing, corrupted and unknown payloads apart', () => {
    expect(decodeDescription(null).kind).toBe('none');
    expect(decodeDescription('Smart filter · managed by Spoticast').kind).toBe(
      'none',
    );
    expect(decodeDescription('sc1:bm90IGpzb24').kind).toBe('invalid');
    const future = btoa(JSON.stringify([2, 'a'])).replace(/=+$/, '');
    expect(decodeDescription(`sc1:${future}`).kind).toBe('invalid');
    const badStatus = btoa(
      JSON.stringify([1, 'a', null, null, null, 'x', '', 0, 0, 'n', null]),
    ).replace(/=+$/, '');
    expect(decodeDescription(`sc1:${badStatus}`).kind).toBe('invalid');
  });

  it('falls back to a local-only marker when the config is too long', () => {
    const long = {
      ...list,
      showIds: Array.from({ length: 60 }, (_, i) => showId(i)),
    };
    expect(encodeSmartList(long)).toBeNull();
    const description = describeSmartList(long);
    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(decodeDescription(description)).toEqual({
      kind: 'local',
      updatedAt: list.updatedAt,
    });
  });

  it('fits a few dozen podcasts', () => {
    const many = {
      ...list,
      criteria: { ...list.criteria, text: '' },
      showIds: Array.from({ length: 25 }, (_, i) => showId(i)),
    };
    expect(encodeSmartList(many)).not.toBeNull();
  });

  it('resolves show prefixes and keeps the ones it cannot match', () => {
    const shows = [{ id: showId(1) }, { id: showId(3) }];
    expect(resolveShowIds(['00001', '00002'], shows)).toEqual([
      showId(1),
      '00002',
    ]);
    expect(resolveShowIds(null, shows)).toBeNull();
  });

  describe('shouldWriteDescription', () => {
    it('skips the write when Spotify already has this config', () => {
      expect(shouldWriteDescription(list, describeSmartList(list))).toBe(false);
    });

    it('rewrites stale, corrupted or missing configs', () => {
      const older = describeSmartList({ ...list, updatedAt: 1 });
      expect(shouldWriteDescription(list, older)).toBe(true);
      expect(shouldWriteDescription(list, 'sc1:garbage')).toBe(true);
      expect(shouldWriteDescription(list, null)).toBe(true);
    });

    it('never overwrites a newer config that was too long to sync', () => {
      const newer = `x sc1:local.${(list.updatedAt + 1).toString(36)}`;
      expect(shouldWriteDescription(list, newer)).toBe(false);
      const older = `x sc1:local.${(list.updatedAt - 1).toString(36)}`;
      expect(shouldWriteDescription(list, older)).toBe(true);
    });
  });
});
