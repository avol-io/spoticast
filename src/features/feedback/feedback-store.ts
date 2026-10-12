import { create } from 'zustand';
import { diag } from '../../lib/diagnostics/log';

interface FeedbackState {
  open: boolean;
}

/** The feedback sheet (beta), opened from Settings, the player or a toast. */
export const useFeedback = create<FeedbackState>()(() => ({ open: false }));

export function openFeedback(from: string) {
  diag('ui', 'feedback opened', { from });
  useFeedback.setState({ open: true });
}

export function closeFeedback() {
  useFeedback.setState({ open: false });
}
