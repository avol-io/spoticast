import { X } from 'lucide-react';
import { useToasts } from '../../lib/storage/toasts';

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none flex flex-col items-center gap-2 px-4 pb-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl ${
            t.tone === 'error' ? 'bg-danger text-white' : 'bg-fg text-bg'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="×"
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toaster;
