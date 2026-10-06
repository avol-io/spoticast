import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';

const RELOAD_FLAG = 'spoticast.chunk-reload';

/**
 * After a deploy the FTP sync deletes the old hashed chunks, so a tab still
 * running the previous version fails to lazy-load pages.
 */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(
    message,
  );
}

/** Route error boundary: reloads once on stale chunks, else offers a reload. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const stale = isStaleChunkError(error);

  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  return (
    <div
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-bold">{t('errors.crashTitle')}</h1>
      <p className="max-w-sm text-fg-muted">{t('errors.crashHint')}</p>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(RELOAD_FLAG);
          } catch {
            // ignore
          }
          window.location.reload();
        }}
        className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-semibold text-brand-fg"
      >
        <RefreshCw className="size-4" aria-hidden />
        {t('errors.reload')}
      </button>
      {error instanceof Error && !stale && (
        <pre className="max-w-full overflow-x-auto text-xs text-fg-subtle">
          {error.message}
        </pre>
      )}
    </div>
  );
}

export default RouteError;
