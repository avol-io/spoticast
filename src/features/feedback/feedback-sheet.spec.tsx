import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearLog, diag } from '../../lib/diagnostics/log';
import { closeFeedback, openFeedback, useFeedback } from './feedback-store';

import FeedbackSheet from './feedback-sheet';

describe('FeedbackSheet', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearLog();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => act(() => closeFeedback()));

  it('renders nothing while closed', () => {
    const { container } = render(<FeedbackSheet />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mails the description with the log', async () => {
    diag('sdk', 'not ready', { device: 'web01234' });
    render(<FeedbackSheet />);
    act(() => openFeedback('test'));

    await userEvent.type(
      screen.getByLabelText('What happened?'),
      'Playback stopped',
    );
    const send = screen.getByRole('link', { name: 'Send email' });
    const href = send.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:spoticast@avol.io?')).toBe(true);
    const body = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get(
      'body',
    );
    expect(body).toMatch(/^Playback stopped\r\n/);
    expect(body).toContain('sdk not ready device=web01234');

    send.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(send);
    expect(useFeedback.getState().open).toBe(false);
  });

  it('freezes the log when it opens', async () => {
    render(<FeedbackSheet />);
    act(() => openFeedback('test'));
    diag('cmd', 'later event');
    await userEvent.type(screen.getByLabelText('What happened?'), 'x');
    expect(screen.getByText(/feedback opened/)).toBeInTheDocument();
    expect(screen.queryByText(/later event/)).not.toBeInTheDocument();
  });

  it('copies the whole log as JSON', async () => {
    render(<FeedbackSheet />);
    act(() => openFeedback('test'));
    await userEvent.click(screen.getByRole('button', { name: 'Copy log' }));
    expect(writeText).toHaveBeenCalledOnce();
    const json = JSON.parse(writeText.mock.calls[0][0]);
    expect(json.events.map((e: { e: string }) => e.e)).toContain(
      'feedback opened',
    );
    expect(json.snapshot).toHaveProperty('player');
  });
});
