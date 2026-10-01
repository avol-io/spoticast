import { createHash } from 'node:crypto';
import {
  codeChallenge,
  generateCodeVerifier,
  getAccessToken,
  loopbackUrl,
  useAuth,
} from './auth';

const tokenResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('PKCE helpers', () => {
  it('generates verifiers from the allowed alphabet', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('computes the S256 challenge as base64url(sha256(verifier))', async () => {
    const verifier = generateCodeVerifier();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(await codeChallenge(verifier)).toBe(expected);
  });
});

describe('getAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuth.setState({ tokens: null });
  });

  it('returns the current token while it is fresh', async () => {
    useAuth.setState({
      tokens: {
        accessToken: 'fresh',
        refreshToken: 'r',
        expiresAt: Date.now() + 3_600_000,
        scope: '',
      },
    });
    expect(await getAccessToken()).toBe('fresh');
  });

  it('refreshes once for concurrent callers and keeps the refresh token', async () => {
    useAuth.setState({
      tokens: {
        accessToken: 'old',
        refreshToken: 'r1',
        expiresAt: Date.now() - 1,
        scope: '',
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        tokenResponse({ access_token: 'new', expires_in: 3600, scope: 's' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([getAccessToken(), getAccessToken()]);
    expect([a, b]).toEqual(['new', 'new']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().tokens?.refreshToken).toBe('r1');
  });

  it('logs out when the refresh token is rejected', async () => {
    useAuth.setState({
      tokens: {
        accessToken: 'old',
        refreshToken: 'bad',
        expiresAt: 0,
        scope: '',
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(tokenResponse({ error: 'invalid_grant' }, 400)),
    );
    await expect(getAccessToken()).rejects.toThrow('invalid_grant');
    expect(useAuth.getState().tokens).toBeNull();
  });
});

describe('loopbackUrl', () => {
  it('moves localhost to 127.0.0.1 keeping port, path and query', () => {
    expect(loopbackUrl('http://localhost:4200/podcast/1?x=1')).toBe(
      'http://127.0.0.1:4200/podcast/1?x=1',
    );
  });

  it('leaves other hosts alone', () => {
    expect(loopbackUrl('http://127.0.0.1:4200/')).toBeNull();
    expect(loopbackUrl('https://spoticast.it/')).toBeNull();
  });
});
