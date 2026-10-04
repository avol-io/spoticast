import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import * as endpoints from '../../lib/spotify/endpoints';
import { useRecentSearches } from '../../lib/storage/recent-searches';
import { useSettings } from '../../lib/storage/settings';

import SearchPage from './search-page';

function renderPage(url = '/search') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  qc.setQueryData(['shows', 'saved'], []);
  qc.setQueryData(['charts', 'it'], {
    market: 'it',
    updatedAt: '2026-10-04T05:00:00Z',
    top: [
      {
        rank: 1,
        id: 't1',
        name: 'Top show',
        publisher: '',
        image: null,
        move: 'UNCHANGED',
      },
    ],
    trending: [
      {
        rank: 1,
        id: 'r1',
        name: 'Rising show',
        publisher: '',
        image: null,
        move: 'UP',
      },
    ],
  });
  const router = createMemoryRouter(
    [{ path: '/search', element: <SearchPage /> }],
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('SearchPage', () => {
  beforeEach(() => useSettings.setState({ chartsMarket: 'it' }));
  afterEach(() => {
    vi.restoreAllMocks();
    useSettings.setState({ chartsMarket: null });
    useRecentSearches.setState({ recent: [] });
  });

  it('shows trending charts while the field is empty, and Top on demand', async () => {
    renderPage();
    expect(screen.getByText('Rising show')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Top podcasts' }));
    expect(screen.getByText('Top show')).toBeInTheDocument();
  });

  it('searches after typing and remembers the query', async () => {
    vi.spyOn(endpoints, 'search').mockResolvedValue({
      shows: {
        items: [
          { id: 's', uri: 'spotify:show:s', name: 'Tech found', images: [] },
        ],
        next: null,
      } as never,
    });
    const router = renderPage();
    await userEvent.type(screen.getByRole('searchbox'), 'tech{Enter}');
    expect(await screen.findByText('Tech found')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=tech');
    expect(useRecentSearches.getState().recent).toEqual(['tech']);
  });

  it('restores the query from the URL and switches to episodes', async () => {
    const spy = vi.spyOn(endpoints, 'search').mockResolvedValue({
      episodes: { items: [], next: null } as never,
      shows: { items: [], next: null } as never,
    });
    const router = renderPage('/search?q=news');
    expect(screen.getByRole('searchbox')).toHaveValue('news');
    await userEvent.click(screen.getByRole('radio', { name: 'Episodes' }));
    expect(router.state.location.search).toBe('?q=news&type=episode');
    await act(async () => undefined);
    expect(spy).toHaveBeenLastCalledWith(
      'news',
      'episode',
      0,
      expect.anything(),
    );
  });
});
