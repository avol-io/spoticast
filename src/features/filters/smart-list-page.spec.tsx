import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { emptyCriteria } from '../../lib/filters/engine';
import { queryClient } from '../../lib/query/query-client';
import { useFilters } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';
import * as smartLists from './smart-lists';

import SmartListPage from './smart-list-page';

const episode = (id: string, minutes: number, date: string) => ({
  id,
  uri: `spotify:episode:${id}`,
  name: `Episode ${id}`,
  description: '',
  duration_ms: minutes * 60_000,
  release_date: date,
  images: [],
  external_urls: { spotify: '' },
  resume_point: { fully_played: false, resume_position_ms: 0 },
});

function renderPage() {
  queryClient.setQueryData(libraryKeys.savedShows, [
    {
      added_at: '',
      show: { id: 's1', name: 'Tech', images: [], media_type: 'audio' },
    },
    {
      added_at: '',
      show: { id: 's2', name: 'News', images: [], media_type: 'audio' },
    },
  ]);
  queryClient.setQueryData(libraryKeys.latestEpisodes('s1'), {
    items: [episode('a', 15, '2024-05-01'), episode('b', 90, '2024-05-02')],
    next: null,
  });
  queryClient.setQueryData(libraryKeys.latestEpisodes('s2'), {
    items: [episode('c', 10, '2024-05-03')],
    next: null,
  });
  const router = createMemoryRouter(
    [
      { path: '/filters/:filterId', element: <SmartListPage /> },
      { path: '/filters', element: <p>all filters</p> },
    ],
    { initialEntries: ['/filters/l1'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('SmartListPage', () => {
  beforeEach(() =>
    useFilters.setState({
      smartLists: [
        {
          id: 'l1',
          name: 'Quick',
          criteria: { ...emptyCriteria, maxMinutes: 30 },
          showIds: null,
          includeArchived: false,
          sort: 'newest',
          spotifyPlaylist: false,
          playlistId: null,
          playlistName: null,
        },
      ],
    }),
  );
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('lists matching episodes from every podcast, newest first', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Quick' })).toBeInTheDocument();
    const items = within(
      screen.getAllByRole('list').at(-1) as HTMLElement,
    ).getAllByRole('listitem');
    expect(
      items.map((li) => within(li).getByRole('heading').textContent),
    ).toEqual(['Episode c', 'Episode a']);
    expect(screen.getByText(/2 episodes/)).toBeInTheDocument();
  });

  it('deletes the filter and its playlist', async () => {
    const drop = vi.spyOn(smartLists, 'dropSmartPlaylist').mockResolvedValue();
    renderPage();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'More actions' })[0],
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Delete filter' }),
    );
    expect(useFilters.getState().smartLists).toEqual([]);
    expect(drop).toHaveBeenCalled();
    expect(await screen.findByText('all filters')).toBeInTheDocument();
  });
});
