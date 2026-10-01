import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { navItems } from './nav-items';

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('appName')}
      className="pb-safe border-t border-border bg-surface/90 backdrop-blur-md"
    >
      <ul className="grid grid-cols-5">
        {navItems.map(({ to, icon: Icon, labelKey, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-fg-muted'
                }`
              }
            >
              <Icon className="size-6" strokeWidth={1.8} aria-hidden />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default BottomNav;
