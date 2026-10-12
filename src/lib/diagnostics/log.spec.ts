import { DIAG_WINDOW_MS } from './config';
import {
  clearLog,
  diag,
  reloadLog,
  saveLog,
  shortDevice,
  shortId,
  shortName,
  snapshotLog,
} from './log';

describe('diagnostics log', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'));
    clearLog();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps only the events of the time window', () => {
    diag('life', 'old');
    vi.advanceTimersByTime(DIAG_WINDOW_MS - 1000);
    diag('life', 'recent');
    vi.advanceTimersByTime(2000);
    expect(snapshotLog().map((entry) => entry.e)).toEqual(['recent']);
  });

  it('drops undefined values and shortens long strings', () => {
    diag('cmd', 'play', { ep: 'a', device: undefined, note: 'x'.repeat(300) });
    const [entry] = snapshotLog();
    expect(entry.d).not.toHaveProperty('device');
    expect(String(entry.d?.note)).toHaveLength(201);
  });

  it('saves shortly after an event, so a reload keeps it', () => {
    diag('sdk', 'ready');
    reloadLog();
    expect(snapshotLog()).toEqual([]);

    diag('sdk', 'ready');
    vi.advanceTimersByTime(2000);
    reloadLog();
    expect(snapshotLog().map((entry) => entry.e)).toEqual(['ready']);
  });

  it('saves at once on request', () => {
    diag('life', 'hidden');
    saveLog();
    reloadLog();
    expect(snapshotLog()).toHaveLength(1);
  });

  it('never throws when storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => {
      diag('life', 'hidden');
      saveLog();
    }).not.toThrow();
    expect(snapshotLog()).toHaveLength(1);
  });

  it('shortens ids, device ids and names', () => {
    expect(shortId('spotify:episode:abc')).toBe('abc');
    expect(shortId('abc')).toBe('abc');
    expect(shortId(null)).toBeNull();
    expect(shortDevice('0123456789abcdef')).toBe('01234567');
    expect(shortName('x'.repeat(50))).toBe(`${'x'.repeat(39)}…`);
  });
});
