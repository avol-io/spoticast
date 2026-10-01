import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryClient } from '../../lib/query/query-client';
import { usePlayer } from '../player/player-store';
import * as queue from './queue';

import QueuePage from './queue-page';

const ep = (id: string, minutes: number) => ({
  id,
  uri: `spotify:episode:${id}`,
  name: `Episode ${id}`,
  duration_ms: minutes * 60_000,
  release_date: '2024-01-01',
  images: [],
  show: { name: `Show ${id}` },
});

function renderQueue() {
  render(
    <QueryClientProvider client={queryClient}>
      <QueuePage />
    </QueryClientProvider>,
  );
}

describe('QueuePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    usePlayer.setState({ nowPlaying: null });
  });

  it('shows the queue with its total time and the playing head', () => {
    queryClient.setQueryData(queue.queueKey, {
      episodes: [ep('a', 30), ep('b', 45)],
      otherCount: 0,
    });
    usePlayer.setState({ nowPlaying: { uri: 'spotify:episode:a' } as never });
    renderQueue();
    expect(screen.getByText('2 episodes · 1h 15m')).toBeInTheDocument();
    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText(/Now playing/)).toBeInTheDocument();
    expect(within(second).getByText(/Show b/)).toBeInTheDocument();
  });

  it('removes an episode', async () => {
    queryClient.setQueryData(queue.queueKey, {
      episodes: [ep('a', 30)],
      otherCount: 0,
    });
    const remove = vi.spyOn(queue, 'removeFromQueue').mockResolvedValue();
    renderQueue();
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove: Episode a' }),
    );
    expect(remove).toHaveBeenCalledWith('spotify:episode:a');
  });

  it('shows the empty state', () => {
    queryClient.setQueryData(queue.queueKey, { episodes: [], otherCount: 0 });
    renderQueue();
    expect(screen.getByText('Up Next is empty')).toBeInTheDocument();
  });
});
