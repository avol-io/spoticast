import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { IS_BETA, LOGO_URL } from '../../lib/build-info';
import BetaBadge from '../ui/beta-badge';
import { navItems } from './nav-items';

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('appName')}
      className="flex h-full flex-col gap-6 border-r border-border bg-surface px-3 py-6"
    >
      <div className="flex items-center gap-3 px-3">
        <img src={LOGO_URL} alt="" className="size-9" />
        <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
        {IS_BETA && <BetaBadge />}
      </div>
      <ul className="flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, labelKey, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-3 text-fg'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <Icon className="size-5" strokeWidth={1.8} aria-hidden />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Sidebar;
