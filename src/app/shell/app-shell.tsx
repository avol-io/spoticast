import { Outlet, ScrollRestoration } from 'react-router-dom';
import FullPlayer from '../../features/player/full-player';
import MiniPlayer from '../../features/player/mini-player';
import PlayerRuntime from '../../features/player/player-runtime';
import { usePlayer } from '../../features/player/player-store';
import VideoSheet from '../../features/player/video-sheet';
import Toaster from '../ui/toaster';
import BottomNav from './bottom-nav';
import Sidebar from './sidebar';

/**
 * Mobile: content + a bottom stack (toasts, mini player, nav). Desktop (lg+):
 * fixed sidebar on the left and the mini player as a bottom bar.
 */
export function AppShell() {
  const hasPlayer = usePlayer((s) => s.nowPlaying !== null);
  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      <main
        className={
          hasPlayer
            ? 'pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-28'
            : 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-8'
        }
      >
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 lg:left-60">
        <Toaster />
        <MiniPlayer />
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
      <FullPlayer />
      <VideoSheet />
      <PlayerRuntime />
      <ScrollRestoration />
    </div>
  );
}

export default AppShell;
