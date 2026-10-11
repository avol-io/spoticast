import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AriaAttributes,
  type CSSProperties,
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
  placement?: 'auto' | 'top' | 'bottom';
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'center' | 'end';
  role?: 'menu' | 'dialog';
  /** Extra classes for the panel (width, padding). */
  className?: string;
  /** Extra classes for the wrapper of trigger and panel (e.g. flex-1). */
  rootClassName?: string;
}

/** Space kept between the panel and the trigger or the screen edges. */
const GAP = 8;

/** Without the Popover API (old browsers, jsdom) the panel is just fixed. */
const supportsPopover =
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/**
 * A panel anchored to its trigger; closes on outside clicks, Escape and
 * scrolling. The panel goes in the top layer (Popover API), so a row with
 * `overflow: hidden` or the next row cannot cut or cover it, while it stays
 * in place in the DOM for focus order and dialogs' focus traps.
 */
export function Popover({
  label,
  trigger,
  children,
  placement = 'auto',
  align = 'end',
  role = 'dialog',
  className = '',
  rootClassName = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [upwards, setUpwards] = useState(placement === 'top');
  const [position, setPosition] = useState<CSSProperties>({
    visibility: 'hidden',
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    // The panel is fixed: scrolling the page would leave it behind.
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const anchor = rootRef.current;
    if (!open || !panel || !anchor) return;
    if (supportsPopover) panel.showPopover();
    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left =
      align === 'end'
        ? a.right - p.width
        : align === 'center'
          ? a.left + (a.width - p.width) / 2
          : a.left;
    const top = upwards ? a.top - GAP - p.height : a.bottom + GAP / 2;
    setPosition({
      left: Math.max(GAP, Math.min(left, vw - p.width - GAP)),
      top: Math.max(GAP, Math.min(top, vh - p.height - GAP)),
    });
    return () => {
      if (supportsPopover && panel.matches(':popover-open'))
        panel.hidePopover();
      setPosition({ visibility: 'hidden' });
    };
  }, [open, upwards, align]);

  return (
    <div ref={rootRef} className={`relative ${rootClassName}`}>
      {trigger({
        'aria-haspopup': role,
        'aria-expanded': open,
        'aria-controls': open ? id : undefined,
        onClick: () => {
          if (placement === 'auto') {
            // Near the bottom (rows above the mini player), open upwards.
            const rect = rootRef.current?.getBoundingClientRect();
            setUpwards(!!rect && rect.bottom > window.innerHeight - 340);
          } else setUpwards(placement === 'top');
          setOpen((o) => !o);
        },
      })}
      {open && (
        <div
          ref={panelRef}
          id={id}
          role={role}
          aria-label={label}
          popover={supportsPopover ? 'manual' : undefined}
          data-placement={upwards ? 'top' : 'bottom'}
          style={{
            position: 'fixed',
            right: 'auto',
            bottom: 'auto',
            ...position,
          }}
          className={`z-50 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-2xl ${className}`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export default Popover;
