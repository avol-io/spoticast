import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as endpoints from '../../lib/spotify/endpoints';
import type { SimplifiedShow } from '../../lib/spotify/types';
import { libraryKeys } from '../library/queries';

import ShowResultRow from './show-result-row';

describe('ShowResultRow', () => {
  afterEach(() => vi.restoreAllMocks());

  it('links to the podcast and follows it', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    qc.setQueryData(libraryKeys.savedShows, []);
    const save = vi.spyOn(endpoints, 'saveToLibrary').mockResolvedValue();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ShowResultRow
            rank={3}
            show={
              {
                id: 's',
                uri: 'spotify:show:s',
                name: 'News',
                images: [],
                media_type: 'audio',
              } as unknown as SimplifiedShow
            }
            subtitle="Publisher"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /News/ })).toHaveAttribute(
      'href',
      '/podcast/s',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Follow: News' }));
    expect(save).toHaveBeenCalledWith(['spotify:show:s']);
  });
});
