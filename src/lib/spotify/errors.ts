import { useTranslation } from 'react-i18next';
import { SpotifyApiError } from './client';

export type ErrorKey =
  | 'errors.notAllowlisted'
  | 'errors.rateLimited'
  | 'errors.offline';

/** Maps errors users can act on to an explanation; null for anything else. */
export function errorKey(
  error: unknown,
  online = navigator.onLine,
): ErrorKey | null {
  if (error instanceof SpotifyApiError) {
    // Development Mode answers 403 for accounts missing from the allow-list.
    if (
      error.status === 403 &&
      /regist|developer\.spotify\.com|dashboard/i.test(error.message)
    ) {
      return 'errors.notAllowlisted';
    }
    if (error.status === 429) return 'errors.rateLimited';
  }
  if (
    !online ||
    (error instanceof TypeError && /fetch|network/i.test(error.message))
  ) {
    return 'errors.offline';
  }
  return null;
}

/** Human readable text for an error shown in an empty state. */
export function useErrorText(): (error: unknown) => string {
  const { t } = useTranslation();
  return (error) => {
    const key = errorKey(error);
    if (key) return t(key);
    return error instanceof Error ? error.message : String(error);
  };
}
