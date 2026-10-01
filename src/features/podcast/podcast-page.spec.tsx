import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { libraryKeys } from '../library/queries';

import PodcastPage from './podcast-page';

const episode = (id: string, played: boolean) => ({
  id,
  name: `Episode ${id}`,
  duration_ms: 600_000,
  release_date: '2024-01-01',
  images: [],
  resume_point: { fully_played: played, resume_position_ms: 0 },
});

function renderPage(url = '/podcast/s1') {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  const show = {
    id: 's1',
    uri: 'spotify:show:s1',
    name: 'Tech Talk',
    images: [],
    media_type: 'audio',
    total_episodes: 3,
    external_urls: { spotify: '' },
  };
  qc.setQueryData(libraryKeys.savedShows, [{ added_at: '', show }]);
  qc.setQueryData(libraryKeys.show('s1'), show);
  qc.setQueryData(libraryKeys.latestEpisodes('s1'), {
    items: [episode('1', false), episode('2', true), episode('3', false)],
    next: null,
    offset: 0,
    limit: 50,
  });
  const router = createMemoryRouter(
    [{ path: '/podcast/:showId', element: <PodcastPage /> }],
    {
      initialEntries: [url],
    },
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('PodcastPage', () => {
  it('lists unplayed episodes and switches to archived ones', async () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tech Talk' }),
    ).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Episode 1')).toBeInTheDocument();
    expect(within(panel).queryByText('Episode 2')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /to listen\s*2/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.click(screen.getByRole('tab', { name: /archived\s*1/i }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Episode 2'),
    ).toBeInTheDocument();
  });

  it('opens on the archived tab from the URL', () => {
    renderPage('/podcast/s1?tab=archived');
    expect(screen.getByRole('tab', { name: /archived/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
