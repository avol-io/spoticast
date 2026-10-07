import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import './i18n';
import { listenForInstallPrompt } from './lib/pwa/install';
import { registerServiceWorker } from './lib/pwa/register';
import { loopbackUrl } from './lib/spotify/auth';

// A view transition interrupted by a quicker navigation rejects its promises
// with an AbortError nobody awaits: it's expected, not a crash.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as
    | { name?: string; message?: string }
    | undefined;
  if (
    reason?.name === 'AbortError' &&
    /transition/i.test(reason.message ?? '')
  ) {
    event.preventDefault();
  }
});

const loopback = loopbackUrl(window.location.href);

if (loopback) {
  window.location.replace(loopback);
} else {
  listenForInstallPrompt();
  registerServiceWorker();
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
  );

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
