import { SpotifyApiError } from './client';
import { errorKey } from './errors';

describe('errorKey', () => {
  it('recognizes accounts missing from the Development Mode allow-list', () => {
    const error = new SpotifyApiError(
      403,
      'Check settings on developer.spotify.com/dashboard, the user may not be registered.',
    );
    expect(errorKey(error, true)).toBe('errors.notAllowlisted');
  });

  it('recognizes rate limits and network failures', () => {
    expect(errorKey(new SpotifyApiError(429, 'Too many'), true)).toBe(
      'errors.rateLimited',
    );
    expect(errorKey(new TypeError('Failed to fetch'), true)).toBe(
      'errors.offline',
    );
    expect(errorKey(new Error('x'), false)).toBe('errors.offline');
  });

  it('leaves other errors alone', () => {
    expect(
      errorKey(new SpotifyApiError(403, 'Premium required'), true),
    ).toBeNull();
    expect(errorKey(new Error('boom'), true)).toBeNull();
  });
});
