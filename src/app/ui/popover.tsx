import {
  useEffect,
  useId,
  useRef,
  useState,
  type AriaAttributes,
  type ReactNode,
} from 'react';

export interface PopoverTriggerProps {
  'aria-haspopup': 'menu' | 'dialog';
  'aria-expanded': boolean;
  'aria-controls'?: AriaAttributes['aria-controls'];
  onClick: () => void;
}

export interface PopoverProps {
  /** Accessible name of the panel. */
  label: string;
  /** Renders the button that opens the panel, wired with `props`. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Panel content; a function receives `close`. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** `auto` opens upwards near the bottom of the screen. */
  placement?: 'auto' | 'top';
  role?: 'menu' | 'dialog';
  /** Extra classes for the panel (width, padding). */
  className?: string;
}

/** A panel anchored to its trigger; closes on outside clicks and Escape. */
export function Popover({
  label,
  trigger,
  children,
  placement = 'auto',
  role = 'dialog',
  className = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [upwards, setUpwards] = useState(placement === 'top');
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => setOpen(false);

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
      {trigger({
        'aria-haspopup': role,
        'aria-expanded': open,
        'aria-controls': open ? id : undefined,
        onClick: () => {
          if (placement === 'auto') {
            // Near the bottom (rows above the mini player), open upwards.
            const rect = rootRef.current?.getBoundingClientRect();
            setUpwards(!!rect && rect.bottom > window.innerHeight - 340);
          }
          setOpen((o) => !o);
        },
      })}
      {open && (
        <div
          id={id}
          role={role}
          aria-label={label}
          className={`absolute right-0 z-40 ${upwards ? 'bottom-full mb-2' : 'top-full mt-1'} overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-2xl ${className}`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export default Popover;
