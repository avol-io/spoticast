import { Copy, Mail } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Sheet from '../../app/ui/sheet';
import {
  DIAG_MAX_CHARS,
  DIAG_WINDOW_MS,
  FEEDBACK_EMAIL,
} from '../../lib/diagnostics/config';
import { diag, snapshotLog } from '../../lib/diagnostics/log';
import {
  feedbackMailto,
  formatReport,
  reportJson,
  type Report,
} from '../../lib/diagnostics/report';
import { toast } from '../../lib/storage/toasts';
import { closeFeedback, useFeedback } from './feedback-store';
import { collectSnapshot } from './snapshot';

function FeedbackForm() {
  const { t } = useTranslation();
  const id = useId();
  // Taken once on opening: what happens in this sheet doesn't push the
  // events that matter out of the window.
  const [captured] = useState(() => {
    const capturedAt = Date.now();
    return {
      capturedAt,
      entries: snapshotLog(capturedAt),
      snapshot: collectSnapshot(capturedAt),
    };
  });
  const [description, setDescription] = useState('');
  const report: Report = useMemo(
    () => ({ ...captured, description }),
    [captured, description],
  );
  const body = useMemo(() => formatReport(report, DIAG_MAX_CHARS), [report]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportJson(report));
      diag('ui', 'feedback log copied');
      toast(t('feedback.copied'));
    } catch {
      toast(t('feedback.copyFailed'), { tone: 'error' });
    }
  };

  return (
    <Sheet open onClose={closeFeedback} label={t('feedback.title')}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{t('feedback.title')}</h2>
          <p className="text-sm text-fg-muted">
            {t('feedback.intro', {
              email: FEEDBACK_EMAIL,
              seconds: Math.round(DIAG_WINDOW_MS / 1000),
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={id}
            className="text-xs font-semibold tracking-wider text-fg-subtle uppercase"
          >
            {t('feedback.describe')}
          </label>
          <textarea
            id={id}
            rows={4}
            value={description}
            placeholder={t('feedback.placeholder')}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <details className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold">
            {t('feedback.preview')}
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto font-mono text-xs break-all whitespace-pre-wrap text-fg-muted">
            {body}
          </pre>
        </details>
        <p className="text-xs text-fg-muted">{t('feedback.copyHint')}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={closeFeedback}
            className="rounded-full px-4 py-2 font-semibold text-fg-muted hover:bg-surface-2"
          >
            {t('feedback.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-2 rounded-full bg-surface-3 px-4 py-2 font-semibold"
          >
            <Copy className="size-4" aria-hidden />
            {t('feedback.copy')}
          </button>
          <a
            href={feedbackMailto(body)}
            onClick={() => {
              diag('ui', 'feedback sent', { chars: body.length });
              closeFeedback();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 font-semibold text-brand-fg"
          >
            <Mail className="size-4" aria-hidden />
            {t('feedback.send')}
          </a>
        </div>
      </div>
    </Sheet>
  );
}

/** Feedback for the beta: description, app state and recent log by email. */
export function FeedbackSheet() {
  const open = useFeedback((s) => s.open);
  // Mounted on each opening, so every report captures the moment.
  return open ? <FeedbackForm /> : null;
}

export default FeedbackSheet;
