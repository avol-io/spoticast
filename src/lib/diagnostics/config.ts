/**
 * Diagnostics run on the beta and in development, never in production.
 * Spelled out (not IS_BETA) so it is a literal at build time and production
 * drops the feedback code.
 */
export const DIAG_ENABLED =
  import.meta.env.VITE_CHANNEL === 'beta' || import.meta.env.DEV;

const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** How far back the log goes (VITE_DIAG_WINDOW_SECONDS, default 60). */
export const DIAG_WINDOW_MS =
  positive(import.meta.env.VITE_DIAG_WINDOW_SECONDS, 60) * 1000;

/** Longest report body put in the email (VITE_DIAG_MAX_CHARS). */
export const DIAG_MAX_CHARS = positive(
  import.meta.env.VITE_DIAG_MAX_CHARS,
  16_000,
);

export const FEEDBACK_EMAIL = 'spoticast@avol.io';
