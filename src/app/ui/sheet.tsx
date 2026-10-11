import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /**
   * bottom: sheet on mobile, centered dialog on desktop. card: a centered
   * card on every screen. full: covers the screen.
   */
  variant?: 'bottom' | 'card' | 'full';
  className?: string;
  /** Inline styles of the panel (e.g. a view transition name). */
  style?: CSSProperties;
}

const panelClasses = {
  bottom:
    'pb-safe max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl lg:max-w-lg lg:rounded-3xl',
  card: 'max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface shadow-2xl',
  full: 'size-full overflow-y-auto bg-bg',
};

/** Modal overlay rendered in a portal; closes on Escape and backdrop click. */
export function Sheet({
  open,
  onClose,
  label,
  children,
  variant = 'bottom',
  className = '',
  style,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Keep keyboard focus inside the dialog.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        variant === 'card'
          ? 'items-center px-3 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]'
          : 'items-end lg:items-center'
      }`}
    >
      {variant !== 'full' && (
        <div
          aria-hidden
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={style}
        className={`relative outline-none ${panelClasses[variant]} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Sheet;
