import { APP_BUILD } from '../build-info';
import { isStandalone } from '../pwa/install';
import { DIAG_ENABLED } from './config';
import { diag, saveLog } from './log';

let started = false;

const errorText = (reason: unknown) =>
  reason instanceof Error
    ? { name: reason.name, message: reason.message }
    : { name: typeof reason, message: String(reason) };

/**
 * Logs the page lifecycle (hidden, frozen, restored, online) and uncaught
 * errors. The log is written to storage whenever the page may go away.
 */
export function startDiagnostics(): void {
  if (!DIAG_ENABLED || started) return;
  started = true;

  const navigation = performance.getEntriesByType?.('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  diag('life', 'app start', {
    version: APP_BUILD.version,
    sha: APP_BUILD.sha,
    navigation: navigation?.type,
    standalone: isStandalone(),
    visibility: document.visibilityState,
    online: navigator.onLine,
  });

  document.addEventListener('visibilitychange', () => {
    diag('life', document.hidden ? 'hidden' : 'visible');
    if (document.hidden) saveLog();
  });
  window.addEventListener('pagehide', (e) => {
    diag('life', 'pagehide', { persisted: e.persisted });
    saveLog();
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) diag('life', 'pageshow', { persisted: true });
  });
  // Page Lifecycle API (Chromium): the tab is frozen, then resumed.
  document.addEventListener('freeze', () => {
    diag('life', 'freeze');
    saveLog();
  });
  document.addEventListener('resume', () => diag('life', 'resume'));
  window.addEventListener('online', () => diag('life', 'online'));
  window.addEventListener('offline', () => diag('life', 'offline'));

  window.addEventListener('error', (e) => {
    diag('error', 'uncaught', {
      message: e.message,
      source: e.filename?.split('/').pop(),
      line: e.lineno,
    });
    saveLog();
  });
  // Registered after main.tsx's handler: expected rejections are already
  // marked as handled there.
  window.addEventListener('unhandledrejection', (e) => {
    if (e.defaultPrevented) return;
    diag('error', 'unhandled rejection', errorText(e.reason));
    saveLog();
  });
}
