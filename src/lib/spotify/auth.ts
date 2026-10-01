import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const PKCE_KEY = 'spoticast.pkce';
/** Refresh a minute early so in-flight requests never carry a stale token. */
const EXPIRY_MARGIN_MS = 60_000;

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-library-modify',
  'user-read-playback-position',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
];

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scope: string;
}

interface AuthState {
  tokens: Tokens | null;
  setTokens: (tokens: Tokens | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      setTokens: (tokens) => set({ tokens }),
    }),
    { name: 'spoticast.auth', version: 1 },
  ),
);

export class AuthError extends Error {
  override name = 'AuthError';
}

export function clientId(): string {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '';
}

export function redirectUri(): string {
  return new URL(
    `${import.meta.env.BASE_URL}callback`,
    window.location.origin,
  ).toString();
}

const VERIFIER_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function generateCodeVerifier(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(
    bytes,
    (b) => VERIFIER_CHARS[b % VERIFIER_CHARS.length],
  ).join('');
}

function base64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64Url(digest);
}

/** Redirects the browser to Spotify's consent screen. */
export async function login(returnTo = '/'): Promise<void> {
  const verifier = generateCodeVerifier();
  const state = generateCodeVerifier(16);
  // localStorage, not sessionStorage: installed PWAs on iOS may complete the
  // redirect in a different browsing context.
  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    scope: SCOPES.join(' '),
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    state,
  });
  window.location.assign(`${AUTHORIZE_URL}?${params}`);
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

async function requestToken(
  body: Record<string, string>,
  previousRefreshToken?: string,
): Promise<Tokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), ...body }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new AuthError(
      detail.error_description ?? detail.error ?? `HTTP ${res.status}`,
    );
  }
  const data: TokenResponse = await res.json();
  return {
    accessToken: data.access_token,
    // Spotify may omit refresh_token on refresh: keep the old one then.
    refreshToken: data.refresh_token ?? previousRefreshToken ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

/**
 * Completes the PKCE flow from the /callback URL. Returns the path the user
 * was on before logging in.
 */
export async function handleCallback(search: string): Promise<string> {
  const params = new URLSearchParams(search);
  const error = params.get('error');
  if (error) throw new AuthError(error);

  const saved = localStorage.getItem(PKCE_KEY);
  if (!saved) throw new AuthError('missing PKCE verifier');
  const { verifier, state, returnTo } = JSON.parse(saved) as {
    verifier: string;
    state: string;
    returnTo: string;
  };
  if (params.get('state') !== state) throw new AuthError('state mismatch');

  const code = params.get('code');
  if (!code) throw new AuthError('missing authorization code');

  const tokens = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  localStorage.removeItem(PKCE_KEY);
  useAuth.getState().setTokens(tokens);
  return returnTo;
}

let refreshing: Promise<Tokens> | null = null;

async function refresh(current: Tokens): Promise<Tokens> {
  // Concurrent callers share one refresh request.
  refreshing ??= requestToken(
    { grant_type: 'refresh_token', refresh_token: current.refreshToken },
    current.refreshToken,
  )
    .then((tokens) => {
      useAuth.getState().setTokens(tokens);
      return tokens;
    })
    .catch((err) => {
      if (err instanceof AuthError) logout();
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Returns a valid access token, refreshing it if needed. */
export async function getAccessToken({
  forceRefresh = false,
} = {}): Promise<string> {
  const tokens = useAuth.getState().tokens;
  if (!tokens) throw new AuthError('not logged in');
  if (!forceRefresh && tokens.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return tokens.accessToken;
  }
  return (await refresh(tokens)).accessToken;
}

export function logout(): void {
  useAuth.getState().setTokens(null);
}
