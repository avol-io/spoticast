import { useAuth } from './auth';
import { chunk, getAll, spotify, SpotifyApiError } from './client';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), init);

describe('spotify client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuth.setState({
      tokens: {
        accessToken: 'token-1',
        refreshToken: 'r',
        expiresAt: Date.now() + 3_600_000,
        scope: '',
      },
    });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    useAuth.setState({ tokens: null });
  });

  it('sends the bearer token and query parameters', async () => {
    fetchMock.mockResolvedValue(json({ id: 'me' }));
    await spotify('/me', { query: { market: 'from_token', skip: undefined } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.spotify.com/v1/me?market=from_token');
    expect(init.headers.Authorization).toBe('Bearer token-1');
  });

  it('resolves empty responses to undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await spotify('/me/player')).toBeUndefined();
  });

  it('refreshes the token once on 401', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        json({ access_token: 'token-2', expires_in: 3600, scope: '' }),
      )
      .mockResolvedValueOnce(json({ ok: true }));
    expect(await spotify('/me')).toEqual({ ok: true });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(
      'Bearer token-2',
    );
  });

  it('waits for Retry-After on 429', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
      )
      .mockResolvedValueOnce(json({ ok: true }));
    const result = spotify('/me');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual({ ok: true });
  });

  it('throws SpotifyApiError with the API message', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          error: {
            status: 403,
            message: 'Premium required',
            reason: 'PREMIUM_REQUIRED',
          },
        },
        { status: 403 },
      ),
    );
    await expect(spotify('/me/player/play')).rejects.toMatchObject({
      status: 403,
      message: 'Premium required',
      reason: 'PREMIUM_REQUIRED',
    });
    await expect(spotify('/x')).rejects.toBeInstanceOf(SpotifyApiError);
  });

  it('follows next links in getAll', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          items: [1, 2],
          next: 'https://api.spotify.com/v1/me/shows?offset=2',
        }),
      )
      .mockResolvedValueOnce(json({ items: [3], next: null }));
    expect(await getAll('/me/shows')).toEqual([1, 2, 3]);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.spotify.com/v1/me/shows?offset=2',
    );
  });

  it('caps concurrent requests at 4', async () => {
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return json({});
    });
    await Promise.all(Array.from({ length: 10 }, () => spotify('/x')));
    expect(peak).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});

describe('chunk', () => {
  it('splits lists by size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
