import { defaultMarket, fetchCharts, flag, marketName } from './charts';

describe('defaultMarket', () => {
  it('prefers the region of the language tag', () => {
    expect(defaultMarket(['it-IT'])).toBe('it');
    expect(defaultMarket(['en-GB', 'en'])).toBe('gb');
    expect(defaultMarket(['de-CH', 'de-AT'])).toBe('at');
  });

  it('falls back to the language, then to the US', () => {
    expect(defaultMarket(['it'])).toBe('it');
    expect(defaultMarket(['pt'])).toBe('br');
    expect(defaultMarket(['ko-KR'])).toBe('us');
  });
});

describe('market helpers', () => {
  it('names markets and builds flags', () => {
    expect(marketName('it', 'en')).toBe('Italy');
    expect(flag('it')).toBe('🇮🇹');
  });
});

describe('fetchCharts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when the market file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 404 })),
    );
    expect(await fetchCharts('it')).toBeNull();
  });

  it('returns null for the dev server HTML fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<html>', { headers: { 'content-type': 'text/html' } }),
        ),
    );
    expect(await fetchCharts('it')).toBeNull();
  });

  it('parses the chart JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ market: 'it', top: [], trending: [] }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    expect(await fetchCharts('it')).toMatchObject({ market: 'it' });
  });
});
