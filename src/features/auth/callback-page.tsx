import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { handleCallback } from '../../lib/spotify/auth';

// The authorization code is single-use: share the exchange between
// StrictMode's double-invoked effects instead of running it twice.
const exchanges = new Map<string, Promise<string>>();

function exchangeOnce(search: string) {
  let pending = exchanges.get(search);
  if (!pending) {
    pending = handleCallback(search);
    exchanges.set(search, pending);
  }
  return pending;
}

export function CallbackPage() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    exchangeOnce(search).then(
      (returnTo) => active && navigate(returnTo, { replace: true }),
      (err: Error) => active && setError(err.message),
    );
    return () => {
      active = false;
    };
  }, [search, navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <p role="alert" className="text-danger">
            {t('auth.callbackError', { message: error })}
          </p>
          <Link to="/" replace className="text-brand underline">
            {t('auth.backToLogin')}
          </Link>
        </>
      ) : (
        <p className="animate-pulse text-fg-muted">
          {t('auth.callbackWorking')}
        </p>
      )}
    </div>
  );
}

export default CallbackPage;
