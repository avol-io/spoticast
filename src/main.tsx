import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import './i18n';
import { loopbackUrl } from './lib/spotify/auth';

const loopback = loopbackUrl(window.location.href);

if (loopback) {
  window.location.replace(loopback);
} else {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
  );

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
