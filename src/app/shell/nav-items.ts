import {
  LayoutGrid,
  ListMusic,
  Search,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey:
    | 'nav.podcasts'
    | 'nav.filters'
    | 'nav.queue'
    | 'nav.search'
    | 'nav.settings';
  /** Only matches the exact path (needed for the index route). */
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', icon: LayoutGrid, labelKey: 'nav.podcasts', end: true },
  { to: '/filters', icon: SlidersHorizontal, labelKey: 'nav.filters' },
  { to: '/queue', icon: ListMusic, labelKey: 'nav.queue' },
  { to: '/search', icon: Search, labelKey: 'nav.search' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];
