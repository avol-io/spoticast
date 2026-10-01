import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** bottom: sheet on mobile, centered dialog on desktop. full: covers the screen. */
  variant?: 'bottom' | 'full';
  className?: string;
}

/** Modal overlay rendered in a portal; closes on Escape and backdrop click. */
export function Sheet({
  open,
  onClose,
  label,
  children,
  variant = 'bottom',
  className = '',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
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
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      {variant === 'bottom' && (
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
        className={`relative outline-none ${
          variant === 'full'
            ? 'size-full overflow-y-auto bg-bg'
            : 'pb-safe max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-2xl lg:max-w-lg lg:rounded-3xl'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Sheet;
