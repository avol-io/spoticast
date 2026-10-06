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
