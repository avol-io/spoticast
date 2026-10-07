import { registerSW } from 'virtual:pwa-register';
import { markUpdateReady, watchForUpdates } from './update';

/**
 * Kept apart from ./update so the UI never imports the PWA plugin's virtual
 * module (Storybook runs without the plugin).
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh: markUpdateReady,
    onRegisteredSW: (_url, registration) => {
      if (registration) watchForUpdates(registration, () => updateSW(true));
    },
  });
}
