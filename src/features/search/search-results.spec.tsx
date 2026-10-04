import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as endpoints from '../../lib/spotify/endpoints';

import SearchResults from './search-results';

const show = (i: number) => ({
  id: `s${i}`,
  uri: `spotify:show:s${i}`,
  name: `Show ${i}`,
  images: [],
  media_type: 'audio',
});

function renderResults(type: 'show' | 'episode') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['shows', 'saved'], []);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchResults query="tech" type={type} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchResults', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pages through podcasts 10 at a time', async () => {
    const spy = vi
      .spyOn(endpoints, 'search')
      .mockImplementation(async (_q, _t, offset = 0) => ({
        shows: {
          items: Array.from({ length: offset === 0 ? 10 : 2 }, (_, i) =>
            show(offset + i),
          ),
          next: offset === 0 ? 'next' : null,
        } as never,
      }));
    renderResults('show');
    expect(await screen.findByText('Show 0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Show 11')).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith('tech', 'show', 10, expect.anything());
    expect(
      screen.queryByRole('button', { name: 'Load more' }),
    ).not.toBeInTheDocument();
  });

  it('loads the show of episode results to enable actions', async () => {
    vi.spyOn(endpoints, 'search').mockResolvedValue({
      episodes: {
        items: [
          {
            id: 'e1',
            uri: 'spotify:episode:e1',
            name: 'Ep one',
            duration_ms: 60_000,
            release_date: '2024-01-01',
            images: [],
          },
        ],
        next: null,
      } as never,
    });
    vi.spyOn(endpoints, 'getEpisode').mockResolvedValue({
      id: 'e1',
      uri: 'spotify:episode:e1',
      name: 'Ep one',
      duration_ms: 60_000,
      release_date: '2024-01-01',
      images: [],
      external_urls: { spotify: '' },
      show: { id: 's', name: 'Parent show', media_type: 'audio' },
    } as never);
    renderResults('episode');
    expect(await screen.findByText(/Parent show/)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Play: Ep one' }),
    ).toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    vi.spyOn(endpoints, 'search').mockResolvedValue({
      shows: { items: [], next: null } as never,
    });
    renderResults('show');
    expect(
      await screen.findByText('No results for “tech”'),
    ).toBeInTheDocument();
  });
});
