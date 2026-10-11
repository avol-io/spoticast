import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { bannerCardClass } from '../../app/ui/banner';
import { canInstall, useInstall } from '../../lib/pwa/install';

const DISMISS_KEY = 'spoticast.install-banner-dismissed-at';
/** A dismissed invite comes back after this long. */
const HIDE_MS = 30 * 24 * 60 * 60 * 1000;

function readDismissedAt(): number {
  try {
    return Number(localStorage.getItem(DISMISS_KEY)) || 0;
  } catch {
    return 0;
  }
}

export interface InstallBannerProps {
  /** card: above the mini player (mobile). sidebar: at the sidebar foot. */
  variant?: 'card' | 'sidebar';
  className?: string;
}

/** Invites to install the app, linking to the how-to page. */
export function InstallBanner({
  variant = 'card',
  className = '',
}: InstallBannerProps) {
  const { t } = useTranslation();
  const hasPrompt = useInstall((s) => s.prompt !== null);
  const installed = useInstall((s) => s.installed);
  const { pathname } = useLocation();
  const [dismissedAt, setDismissedAt] = useState(readDismissedAt);

  if (
    installed ||
    !canInstall(hasPrompt) ||
    Date.now() - dismissedAt < HIDE_MS ||
    pathname === '/install'
  )
    return null;

  const dismiss = () => {
    const now = Date.now();
    setDismissedAt(now);
    try {
      localStorage.setItem(DISMISS_KEY, String(now));
    } catch {
      // ignore
    }
  };

  const dismissButton = (
    <button
      type="button"
      aria-label={t('install.dismiss')}
      onClick={dismiss}
      className="shrink-0 rounded-full p-1 text-fg-muted hover:text-fg"
    >
      <X className="size-4" />
    </button>
  );

  if (variant === 'sidebar')
    return (
      <div
        className={`relative rounded-2xl bg-brand/15 p-3 text-sm ${className}`}
      >
        <div className="absolute top-2 right-2">{dismissButton}</div>
        <p className="pr-6 font-semibold">{t('install.banner')}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t('install.bannerHint')}
        </p>
        <Link
          to="/install"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg"
        >
          <Download className="size-3.5" aria-hidden />
          {t('install.how')}
        </Link>
      </div>
    );

  return (
    <div role="status" className={`${bannerCardClass} ${className}`}>
      <Download className="size-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{t('install.banner')}</span>{' '}
        <span className="text-fg-muted">{t('install.bannerHint')}</span>
      </p>
      <Link
        to="/install"
        className="shrink-0 rounded-full bg-brand px-3 py-1 font-semibold text-brand-fg"
      >
        {t('install.how')}
      </Link>
      {dismissButton}
    </div>
  );
}

export default InstallBanner;
