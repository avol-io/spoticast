import { CloudOff, RefreshCw, X } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  selectPlayingHere,
  usePlayer,
} from '../../features/player/player-store';
import InstallBanner from '../../features/install/install-banner';
import { bannerCardClass } from '../ui/banner';
import { applyUpdate, dismissUpdate, useUpdate } from '../../lib/pwa/update';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const DISMISS_KEY = 'spoticast.premium-banner-dismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Offline notice, the "Premium required" notice of the browser player and the
 * "new version" prompt (held back while audio plays here: updating reloads).
 * They sit right above the mini player, like the toasts, with the invite to
 * install the app.
 */
export function StatusBanners() {
  const { t } = useTranslation();
  const online = useOnline();
  const premiumMissing = usePlayer(
    (s) => s.sdkError === 'player.premiumRequired',
  );
  const playingHere = usePlayer(selectPlayingHere);
  const showUpdate = useUpdate((s) => s.needRefresh && !s.dismissed);
  const next = useUpdate((s) => s.next);
  const [dismissed, setDismissed] = useState(readDismissed);

  return (
    // Children carry their own bottom margin: a hidden one adds no gap.
    <div className="pointer-events-none flex flex-col items-center px-4">
      {!online && (
        <p
          role="status"
          className="pointer-events-auto mb-2 flex items-center gap-2 rounded-full bg-surface-3/80 px-3 py-1 text-xs font-medium shadow-lg ring-1 ring-black/10 backdrop-blur-md"
        >
          <CloudOff className="size-3.5" aria-hidden />
          {t('errors.offline')}
        </p>
      )}
      {showUpdate && !playingHere && (
        <div role="status" className={bannerCardClass}>
          <RefreshCw className="size-3.5 shrink-0" aria-hidden />
          <p className="flex-1">
            {next
              ? t('update.availableVersion', { version: next.version })
              : t('update.available')}
            {next?.releaseUrl && (
              <>
                {' '}
                <a
                  href={next.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  {t('update.whatsNew')}
                </a>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="rounded-full bg-brand px-3 py-1 font-semibold text-brand-fg"
          >
            {t('update.apply')}
          </button>
          <button
            type="button"
            aria-label={t('update.dismiss')}
            onClick={dismissUpdate}
            className="rounded-full p-1 text-fg-muted hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {/* From lg the invite sits at the sidebar foot. */}
      <InstallBanner className="lg:hidden" />
      {premiumMissing && !dismissed && (
        <div role="status" className={bannerCardClass}>
          <p className="flex-1">{t('player.premiumBanner')}</p>
          <button
            type="button"
            aria-label={t('player.dismiss')}
            onClick={() => {
              setDismissed(true);
              try {
                sessionStorage.setItem(DISMISS_KEY, '1');
              } catch {
                // ignore
              }
            }}
            className="rounded-full p-1 text-fg-muted hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default StatusBanners;
