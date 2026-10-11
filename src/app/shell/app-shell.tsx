import { lazy, Suspense } from 'react';
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
const FullPlayer = lazy(() => import('../../features/player/full-player'));
const VideoSheet = lazy(() => import('../../features/player/video-sheet'));

/**
 * Mobile: content + a bottom stack (toasts, mini player, nav). Desktop (lg+):
 * fixed sidebar on the left and the mini player as a bottom bar.
 */
export function AppShell() {
  const { t } = useTranslation();
  const fullPlayerOpen = usePlayer((s) => s.fullPlayerOpen);
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
      <StatusBanners />
      <main
        id="main"
        tabIndex={-1}
        className={`outline-none ${
          selecting
            ? 'pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-48'
            : 'pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-28'
        }`}
      >
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 lg:left-60">
        <Toaster />
        <MiniPlayer />
        {selecting ? (
          <SelectionBar />
        ) : (
          <div className="lg:hidden">
            <BottomNav />
          </div>
        )}
      </div>
      <Suspense fallback={null}>
        {fullPlayerOpen && <FullPlayer />}
        {videoOpen && <VideoSheet />}
      </Suspense>
      <AddToPlaylistSheet />
      <PlayerRuntime />
      <SmartPlaylistsRuntime />
      <ScrollRestoration />
    </div>
  );
}

export default AppShell;
