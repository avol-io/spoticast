import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import IconButton from './icon-button';
import Popover from './popover';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  /** Shows a check mark (radio-like menus). */
  checked?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  label: string;
  icon: ReactNode;
  items: MenuItem[];
  /** Optional heading inside the popover. */
  title?: string;
}

/** Icon button that opens a small anchored list of actions. */
export function Menu({ label, icon, items, title }: MenuProps) {
  return (
    <Popover
      label={label}
      role="menu"
      className="min-w-56 py-1.5"
      trigger={(props) => (
        <IconButton label={label} {...props}>
          {icon}
        </IconButton>
      )}
    >
      {(close) => (
        <>
          {title && (
            <p className="px-4 pt-1.5 pb-1 text-xs font-semibold tracking-wider text-fg-subtle uppercase">
              {title}
            </p>
          )}
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-3 ${
                item.danger ? 'text-danger' : ''
              }`}
            >
              {item.icon && (
                <span className="text-fg-muted [&>svg]:size-4">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.checked && (
                <Check className="size-4 text-brand" aria-hidden />
              )}
            </button>
          ))}
        </>
      )}
    </Popover>
  );
}

export default Menu;
