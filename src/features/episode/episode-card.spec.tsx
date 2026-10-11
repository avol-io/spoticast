import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Episode } from '../../lib/spotify/types';
import { episodeKey } from './open-episode';

import EpisodeCard from './episode-card';

const episode = {
  id: 'e1',
  uri: 'spotify:episode:e1',
  name: 'The episode',
  description: 'Plain notes',
  html_description: '<p>Rich <b>notes</b></p>',
  duration_ms: 30 * 60_000,
  release_date: '2024-01-01',
  images: [],
  external_urls: { spotify: 'https://open.spotify.com/episode/e1' },
  show: { id: 's1', name: 'The show', images: [], media_type: 'audio' },
} as unknown as Episode;

function Search() {
  return <output>{useLocation().search}</output>;
}

function renderCard(seed = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (seed) queryClient.setQueryData(episodeKey('e1'), episode);
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <EpisodeCard />
            <Search />
          </>
        ),
      },
    ],
    { initialEntries: ['/?tab=archived&episode=e1'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('EpisodeCard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the episode named in the URL with its notes and comments', () => {
    renderCard();
    const card = screen.getByRole('dialog', { name: 'Episode details' });
    expect(card).toHaveTextContent('The episode');
    expect(screen.getByRole('link', { name: 'The show' })).toHaveAttribute(
      'href',
      '/podcast/s1',
    );
    expect(screen.getByText('notes')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Comment on Spotify' }),
    ).toHaveAttribute('href', 'https://open.spotify.com/episode/e1');
    expect(
      screen.getByRole('button', { name: 'Play next' }),
    ).toBeInTheDocument();
  });

  it('fetches an episode it does not have yet', async () => {
    const get = vi.spyOn(endpoints, 'getEpisode').mockResolvedValue(episode);
    renderCard(false);
    expect(await screen.findByText('The episode')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('e1', expect.anything());
  });

  it('closes by dropping the param and keeps the others', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('?tab=archived');
  });
});
