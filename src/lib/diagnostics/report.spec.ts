import type { DiagEntry } from './log';
import {
  feedbackMailto,
  formatEntry,
  formatReport,
  reportJson,
  type Report,
} from './report';

const capturedAt = Date.parse('2026-10-12T10:00:00Z');

const entry = (secondsBefore: number, e: string, d?: DiagEntry['d']) =>
  ({ t: capturedAt - secondsBefore * 1000, a: 'cmd', e, d }) as DiagEntry;

const report = (entries: DiagEntry[], description = 'It stopped'): Report => ({
  description,
  capturedAt,
  snapshot: { player: { sdkStatus: 'ready', nowPlaying: { ep: 'a' } } },
  entries,
});

describe('feedback report', () => {
  it('writes one line per event, timed before the capture', () => {
    expect(
      formatEntry(
        entry(12.34, 'pause', { target: 'local', name: 'Two words', n: 3 }),
        capturedAt,
      ),
    ).toBe('-12.3s cmd pause target=local name="Two words" n=3');
  });

  it('starts with the description, then the state and the events', () => {
    const text = formatReport(report([entry(2, 'resume')]), 10_000);
    expect(text.startsWith('It stopped\n')).toBe(true);
    expect(text).toContain(
      '[player]\nsdkStatus: ready\nnowPlaying: {"ep":"a"}',
    );
    expect(text).toContain('captured: 2026-10-12T10:00:00.000Z');
    expect(text.endsWith('-2.0s cmd resume')).toBe(true);
  });

  it('cuts the oldest events past the size limit', () => {
    const entries = Array.from({ length: 200 }, (_, i) =>
      entry(200 - i, `event ${i}`),
    );
    const full = formatReport(report(entries), 100_000);
    const text = formatReport(report(entries), full.length - 500);
    expect(text.length).toBeLessThanOrEqual(full.length - 500);
    expect(text).toMatch(/… \d+ earlier events cut/);
    expect(text).toContain('event 199');
    expect(text).not.toContain('event 0\n');
  });

  it('keeps every event in the JSON', () => {
    const entries = Array.from({ length: 50 }, (_, i) => entry(i, `e${i}`));
    const json = JSON.parse(reportJson(report(entries)));
    expect(json.events).toHaveLength(50);
    expect(json.description).toBe('It stopped');
  });

  it('opens a message to the feedback address', () => {
    const url = feedbackMailto('Line 1\nLine 2 & more');
    expect(url.startsWith('mailto:spoticast@avol.io?subject=')).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('subject')).toMatch(/Feedback/);
    expect(params.get('body')).toBe('Line 1\r\nLine 2 & more');
  });
});
