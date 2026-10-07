import { create } from 'zustand';
import { APP_BUILD, type BuildInfo } from '../build-info';

/** How often a long-running app asks the server for a new service worker. */
export const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

interface UpdateState {
  /** A service worker is registered, so updates can be checked. */
  available: boolean;
  /** A new version is installed and waiting for the user to apply it. */
  needRefresh: boolean;
  /** The user closed the banner: it stays hidden until the next launch. */
  dismissed: boolean;
  checking: boolean;
  /** Outcome of the last manual check, shown in Settings. */
  lastCheck?: 'upToDate' | 'downloading' | 'error';
  /** Version waiting to be applied, read from the deployed version.json. */
  next?: Pick<BuildInfo, 'version' | 'releaseUrl'>;
}

export const useUpdate = create<UpdateState>()(() => ({
  available: false,
  needRefresh: false,
  dismissed: false,
  checking: false,
}));

let registration: ServiceWorkerRegistration | undefined;
let activate: (() => Promise<void>) | undefined;

/**
 * Browsers only look for a new service worker on navigations, which a
 * standalone SPA rarely does: check periodically and whenever the app comes
 * back to the foreground or online.
 */
export function watchForUpdates(
  reg: ServiceWorkerRegistration,
  activateWaiting: () => Promise<void>,
): () => void {
  registration = reg;
  activate = activateWaiting;
  useUpdate.setState({ available: true });

  const check = () => {
    if (!navigator.onLine || reg.installing) return;
    reg.update().catch(() => undefined);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  const timer = setInterval(check, UPDATE_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', check);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', check);
  };
}

export function markUpdateReady() {
  useUpdate.setState({ needRefresh: true, lastCheck: undefined });
  void loadNextVersion();
}

/**
 * Names the waiting version. Left unset when version.json can't be read or
 * still describes the running build (the FTP upload isn't atomic, so sw.js
 * may land before version.json): the UI then shows a generic message.
 */
async function loadNextVersion(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, {
      cache: 'no-store',
    });
    if (!res.ok) return;
    const { version, releaseUrl } = (await res.json()) as Partial<BuildInfo>;
    if (typeof version !== 'string' || version === APP_BUILD.version) return;
    useUpdate.setState({
      next: {
        version,
        releaseUrl: typeof releaseUrl === 'string' ? releaseUrl : undefined,
      },
    });
  } catch {
    // Offline or not deployed (dev server): keep the generic message.
  }
}

/** Manual check from Settings. */
export async function checkForUpdate(): Promise<void> {
  if (!registration) return;
  useUpdate.setState({ checking: true, lastCheck: undefined });
  try {
    await registration.update();
    if (useUpdate.getState().needRefresh) return;
    if (registration.waiting) markUpdateReady();
    else
      useUpdate.setState({
        lastCheck: registration.installing ? 'downloading' : 'upToDate',
      });
  } catch {
    useUpdate.setState({ lastCheck: 'error' });
  } finally {
    useUpdate.setState({ checking: false });
  }
}

/** Activates the waiting service worker; the page reloads once it controls. */
export async function applyUpdate(): Promise<void> {
  if (activate) await activate();
  else window.location.reload();
}

export function dismissUpdate() {
  useUpdate.setState({ dismissed: true });
}

/** Test helper. */
export function resetUpdate() {
  registration = undefined;
  activate = undefined;
  useUpdate.setState({
    available: false,
    needRefresh: false,
    dismissed: false,
    checking: false,
    lastCheck: undefined,
    next: undefined,
  });
}
