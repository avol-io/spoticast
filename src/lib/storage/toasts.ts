import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  action?: { label: string; run: () => void };
}

interface ToastState {
  toasts: Toast[];
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a short message above the player/nav; auto-dismisses. */
export function toast(
  message: string,
  {
    tone = 'info',
    action,
    duration = 4000,
  }: Partial<Omit<Toast, 'id' | 'message'>> & { duration?: number } = {},
) {
  const id = nextId++;
  useToasts.setState((s) => ({
    toasts: [...s.toasts.slice(-2), { id, message, tone, action }],
  }));
  setTimeout(() => useToasts.getState().dismiss(id), duration);
  return id;
}
