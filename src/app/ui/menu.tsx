import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import IconButton from './icon-button';

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
  const [open, setOpen] = useState(false);
  const [upwards, setUpwards] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          // Near the bottom (rows above the mini player), open upwards.
          const rect = rootRef.current?.getBoundingClientRect();
          setUpwards(!!rect && rect.bottom > window.innerHeight - 340);
          setOpen((o) => !o);
        }}
      >
        {icon}
      </IconButton>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={`absolute right-0 z-40 min-w-56 ${upwards ? 'bottom-full mb-1' : 'top-full mt-1'} overflow-hidden rounded-2xl border border-border bg-surface-2 py-1.5 shadow-2xl`}
        >
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
                setOpen(false);
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
        </div>
      )}
    </div>
  );
}

export default Menu;
