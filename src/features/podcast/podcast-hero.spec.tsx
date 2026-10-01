import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import * as endpoints from '../../lib/spotify/endpoints';
import type { SimplifiedShow } from '../../lib/spotify/types';
import { libraryKeys } from '../library/queries';

import PodcastHero from './podcast-hero';

const show = {
  id: 's1',
  uri: 'spotify:show:s1',
  name: 'Tech Talk',
  description: 'All about tech',
  images: [],
  media_type: 'mixed',
  total_episodes: 12,
  external_urls: { spotify: 'https://open.spotify.com/show/s1' },
} as unknown as SimplifiedShow;

function renderHero() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.savedShows, []);
  const router = createMemoryRouter([
    { path: '/', element: <PodcastHero show={show} /> },
  ]);
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return qc;
}

describe('PodcastHero', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows title, episode count, video badge and Spotify link', () => {
    renderHero();
    expect(
      screen.getByRole('heading', { name: 'Tech Talk' }),
    ).toBeInTheDocument();
    expect(screen.getByText('12 episodes')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open in Spotify' }),
    ).toHaveAttribute('href', 'https://open.spotify.com/show/s1');
  });

  it('follows the show through the library endpoint', async () => {
    const save = vi.spyOn(endpoints, 'saveToLibrary').mockResolvedValue();
    renderHero();
    await userEvent.click(screen.getByRole('button', { name: 'Follow' }));
    expect(save).toHaveBeenCalledWith(['spotify:show:s1']);
    expect(
      await screen.findByRole('button', { name: 'Following' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
