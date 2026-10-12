import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  openFeedback,
  useFeedback,
} from '../../features/feedback/feedback-store';
import { DIAG_ENABLED } from '../../lib/diagnostics/config';
import { useToasts, type Toast } from '../../lib/storage/toasts';

export function Toaster() {
  const { t: translate } = useTranslation();
  const { toasts, dismiss } = useToasts();
  const reporting = useFeedback((s) => s.open);
  if (toasts.length === 0) return null;
  // Beta: an error can be reported right away.
  const actionOf = (toast: Toast): Toast['action'] =>
    toast.action ??
    (DIAG_ENABLED && toast.tone === 'error' && !reporting
      ? {
          label: translate('feedback.toastAction'),
          run: () => openFeedback('toast'),
        }
      : undefined);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none flex flex-col items-center gap-2 px-4 pb-2"
    >
      {toasts.map((t) => {
        const action = actionOf(t);
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl ${
              t.tone === 'error' ? 'bg-danger text-danger-fg' : 'bg-fg text-bg'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            {action && (
              <button
                type="button"
                className="font-semibold underline-offset-2 hover:underline"
                onClick={() => {
                  action.run();
                  dismiss(t.id);
                }}
              >
                {action.label}
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
        );
      })}
    </div>
  );
}

export default Toaster;
