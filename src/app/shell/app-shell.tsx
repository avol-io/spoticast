import { Outlet, ScrollRestoration } from 'react-router-dom';
import BottomNav from './bottom-nav';
import Sidebar from './sidebar';

/**
 * Mobile: content + fixed bottom nav. Desktop (lg+): fixed sidebar on the
 * left. The mini player (M3) docks above the bottom nav / at the bottom.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-8">
        <Outlet />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <BottomNav />
      </div>
      <ScrollRestoration />
    </div>
  );
}

export default AppShell;
