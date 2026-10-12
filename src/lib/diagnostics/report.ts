import { APP_BUILD, APP_TITLE } from '../build-info';
import { DIAG_WINDOW_MS, FEEDBACK_EMAIL } from './config';
import type { DiagEntry } from './log';

/** State of the app when the report was opened, by section. */
export type Snapshot = Record<string, Record<string, unknown>>;

export interface Report {
  description: string;
  /** Epoch ms when the report was opened. */
  capturedAt: number;
  snapshot: Snapshot;
  entries: DiagEntry[];
}

const scalar = (value: unknown): string =>
  typeof value === 'string'
    ? /[\s=]/.test(value) || value === ''
      ? JSON.stringify(value)
      : value
    : (JSON.stringify(value) ?? 'undefined');

/** One line per event: seconds before the report, area, event, data. */
export function formatEntry(entry: DiagEntry, capturedAt: number): string {
  const seconds = ((entry.t - capturedAt) / 1000).toFixed(1);
  const data = Object.entries(entry.d ?? {})
    .map(([key, value]) => `${key}=${scalar(value)}`)
    .join(' ');
  return `${seconds}s ${entry.a} ${entry.e}${data ? ` ${data}` : ''}`;
}

function formatSnapshot(snapshot: Snapshot): string[] {
  return Object.entries(snapshot).flatMap(([section, values]) => [
    `[${section}]`,
    ...Object.entries(values).map(
      ([key, value]) =>
        `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`,
    ),
  ]);
}

/**
 * The email body: the user's description, the state and the events. Past
 * `maxChars` the oldest events are cut ("Copy log" keeps them all).
 */
export function formatReport(report: Report, maxChars: number): string {
  const { description, capturedAt, snapshot, entries } = report;
  const head = [
    description.trim() || '(no description)',
    '',
    `--- ${APP_TITLE} diagnostics ---`,
    `version: ${APP_BUILD.version} (${APP_BUILD.sha}) ${APP_BUILD.channel}`,
    `captured: ${new Date(capturedAt).toISOString()}`,
    `window: ${Math.round(DIAG_WINDOW_MS / 1000)}s, ${entries.length} events`,
    '',
    ...formatSnapshot(snapshot),
    '',
    '--- events (seconds before capture) ---',
  ].join('\n');

  const lines = entries.map((entry) => formatEntry(entry, capturedAt));
  // Keep the newest events that fit, leaving room for the cut note.
  let budget = maxChars - head.length - 80;
  let kept = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    budget -= lines[i].length + 1;
    if (budget < 0) break;
    kept++;
  }
  const cut = lines.length - kept;
  return [
    head,
    ...(cut > 0 ? [`… ${cut} earlier events cut (see the copied log)`] : []),
    ...lines.slice(cut),
  ].join('\n');
}

/** The whole report as JSON, for "Copy log". */
export function reportJson(report: Report): string {
  return JSON.stringify(
    {
      description: report.description.trim(),
      captured: new Date(report.capturedAt).toISOString(),
      build: APP_BUILD,
      snapshot: report.snapshot,
      events: report.entries,
    },
    null,
    2,
  );
}

export function feedbackSubject(): string {
  return `[${APP_TITLE}] Feedback ${APP_BUILD.version} (${APP_BUILD.sha})`;
}

/** Opens the user's mail app on a message to the feedback address. */
export function feedbackMailto(body: string): string {
  // Mail clients expect CRLF line breaks in mailto bodies.
  const crlf = body.replace(/\r?\n/g, '\r\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    feedbackSubject(),
  )}&body=${encodeURIComponent(crlf)}`;
}
