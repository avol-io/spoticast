import { LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { clientId, login, redirectUri } from '../../lib/spotify/auth';

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const configured = clientId() !== '';

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand)_25%,transparent),transparent_60%)] px-6 text-center">
      <img
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt=""
        className="size-24 drop-shadow-xl"
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {t('appName')}
        </h1>
        <p className="text-fg-muted">{t('auth.tagline')}</p>
      </div>
      <button
        type="button"
        disabled={!configured}
        onClick={() => void login(location.pathname + location.search)}
        className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-brand-fg shadow-lg transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
      >
        <LogIn className="size-5" aria-hidden />
        {t('auth.login')}
      </button>
      {!configured && (
        <p role="alert" className="max-w-sm text-sm text-danger">
          {t('auth.missingClientId')}
        </p>
      )}
      <p className="max-w-sm text-xs text-fg-subtle">{t('auth.premiumNote')}</p>
      {import.meta.env.DEV && (
        <p className="max-w-sm text-xs text-fg-subtle">
          {t('auth.redirectUriHint')}{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-fg select-all">
            {redirectUri()}
          </code>
        </p>
      )}
    </div>
  );
}

export default LoginPage;
