import {
  LayoutGrid,
  ListFilter,
  ListMusic,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey:
    | 'nav.podcasts'
    | 'nav.playlists'
    | 'nav.queue'
    | 'nav.search'
    | 'nav.settings';
  /** Only matches the exact path (needed for the index route). */
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', icon: LayoutGrid, labelKey: 'nav.podcasts', end: true },
  { to: '/playlists', icon: ListFilter, labelKey: 'nav.playlists' },
  { to: '/queue', icon: ListMusic, labelKey: 'nav.queue' },
  { to: '/search', icon: Search, labelKey: 'nav.search' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];
