import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  closeFeedback,
  useFeedback,
} from '../../features/feedback/feedback-store';
import { toast, useToasts } from '../../lib/storage/toasts';

import Toaster from './toaster';

const diagnostics = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../lib/diagnostics/config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get DIAG_ENABLED() {
    return diagnostics.enabled;
  },
}));

describe('Toaster', () => {
  afterEach(() => {
    useToasts.setState({ toasts: [] });
    closeFeedback();
    diagnostics.enabled = true;
  });

  it('renders queued toasts', () => {
    render(<Toaster />);
    act(() => {
      toast('Added to Up Next');
    });
    expect(screen.getByText('Added to Up Next')).toBeInTheDocument();
  });

  it('offers to report an error (beta)', async () => {
    render(<Toaster />);
    act(() => {
      toast('Added to Up Next');
      toast('Something went wrong', { tone: 'error' });
    });
    const report = screen.getAllByRole('button', { name: 'Report' });
    expect(report).toHaveLength(1);
    await userEvent.click(report[0]);
    expect(useFeedback.getState().open).toBe(true);
  });

  it('keeps errors without a report action in production', () => {
    diagnostics.enabled = false;
    render(<Toaster />);
    act(() => {
      toast('Something went wrong', { tone: 'error' });
    });
    expect(
      screen.queryByRole('button', { name: 'Report' }),
    ).not.toBeInTheDocument();
  });
});
