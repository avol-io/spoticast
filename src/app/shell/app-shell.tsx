import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import AddToPlaylistSheet from '../../features/filters/add-to-playlist-sheet';
import SmartPlaylistsRuntime from '../../features/filters/smart-playlists-runtime';
import MiniPlayer from '../../features/player/mini-player';
import PlayerRuntime from '../../features/player/player-runtime';
import { usePlayer } from '../../features/player/player-store';
import SelectionBar from '../../features/selection/selection-bar';
import { useSelection } from '../../features/selection/selection-store';
import Toaster from '../ui/toaster';
import BottomNav from './bottom-nav';
import NavigationProgress from './navigation-progress';
import Sidebar from './sidebar';
import StatusBanners from './status-banners';

// Only needed once opened: keep them out of the initial bundle.
const VideoSheet = lazy(() => import('../../features/player/video-sheet'));
// Mounted from the start (they render nothing while closed), so their chunks
// load right after the first render and the first opening can run its view
// transition.
const FullPlayer = lazy(() => import('../../features/player/full-player'));
const EpisodeCard = lazy(() => import('../../features/episode/episode-card'));

/**
 * Mobile: content + a bottom stack (toasts, banners, mini player, nav). Desktop (lg+):
 * fixed sidebar on the left and the mini player as a bottom bar.
 */
/**
 * Publishes the height of the bottom stack as --bottom-stack, so the end of
 * the page scrolls clear of it whatever it holds (banners, selection bar).
 */
function useBottomStackHeight() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--bottom-stack', `${node.offsetHeight}px`),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--bottom-stack');
    };
  }, []);
  return ref;
}

export function AppShell() {
  const { t } = useTranslation();
  const stackRef = useBottomStackHeight();
  const videoOpen = usePlayer((s) => s.video !== null);
  const selecting = useSelection((s) => s.scope !== null);
  return (
    <div className="min-h-dvh lg:pl-60">
      <a
        href="#main"
        className="skip-link rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg"
      >
        {t('a11y.skipToContent')}
      </a>
      <NavigationProgress />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      <main
        id="main"
        tabIndex={-1}
        className="pb-[calc(var(--bottom-stack,9rem)+1.5rem)] outline-none"
      >
        <Outlet />
      </main>
      {/* Above dialogs too: actions taken in a card confirm here. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--bottom-stack,0px)] z-[60] lg:left-60">
        <Toaster />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 lg:left-60">
        <div ref={stackRef}>
          <StatusBanners />
          <MiniPlayer />
          {selecting ? (
            <SelectionBar />
          ) : (
            <div className="lg:hidden">
              <BottomNav />
            </div>
          )}
        </div>
      </div>
      <Suspense fallback={null}>{videoOpen && <VideoSheet />}</Suspense>
      <Suspense fallback={null}>
        <FullPlayer />
      </Suspense>
      <Suspense fallback={null}>
        <EpisodeCard />
      </Suspense>
      <AddToPlaylistSheet />
      <PlayerRuntime />
      <SmartPlaylistsRuntime />
      <ScrollRestoration />
    </div>
  );
}

export default AppShell;
