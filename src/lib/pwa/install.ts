import { create } from 'zustand';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const useInstall = create<InstallState>()(() => ({
  prompt: null,
  installed: false,
}));

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS has no install prompt: users add the app from the Share menu. */
export function isIos(userAgent = navigator.userAgent): boolean {
  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(userAgent = navigator.userAgent): boolean {
  return /android/i.test(userAgent);
}

export type InstallPlatform = 'ios' | 'android' | 'desktop';

export function installPlatform(
  userAgent = navigator.userAgent,
): InstallPlatform {
  if (isIos(userAgent)) return 'ios';
  if (isAndroid(userAgent)) return 'android';
  return 'desktop';
}

export type DesktopBrowser = 'chromium' | 'safari' | 'firefox' | 'other';

/** Chrome and Edge install from the address bar, Safari from File. */
export function desktopBrowser(
  userAgent = navigator.userAgent,
): DesktopBrowser {
  if (/firefox\//i.test(userAgent)) return 'firefox';
  if (/edg\/|chrome\/|chromium\//i.test(userAgent)) return 'chromium';
  if (/safari\//i.test(userAgent)) return 'safari';
  return 'other';
}

/**
 * Whether this browser can install the app at all: with its own prompt, or by
 * hand on iOS, Android and Safari on the Mac (Firefox on desktop cannot).
 */
export function canInstall(
  hasPrompt: boolean,
  userAgent = navigator.userAgent,
): boolean {
  if (hasPrompt) return true;
  const platform = installPlatform(userAgent);
  if (platform !== 'desktop') return true;
  return desktopBrowser(userAgent) !== 'firefox';
}

/**
 * Must run before the first render: browsers fire beforeinstallprompt early
 * and only once.
 */
export function listenForInstallPrompt() {
  useInstall.setState({ installed: isStandalone() });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    useInstall.setState({ prompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () =>
    useInstall.setState({ prompt: null, installed: true }),
  );
}

export async function promptInstall(): Promise<boolean> {
  const { prompt } = useInstall.getState();
  if (!prompt) return false;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  useInstall.setState({ prompt: null, installed: outcome === 'accepted' });
  return outcome === 'accepted';
}
