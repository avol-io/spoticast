import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ChartList from './chart-list';

function renderList(data: unknown) {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  qc.setQueryData(['charts', 'it'], data);
  qc.setQueryData(['shows', 'saved'], []);
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ChartList market="it" kind="trending" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChartList', () => {
  it('shows ranked podcasts with their movement', () => {
    renderList({
      market: 'it',
      updatedAt: '2026-10-04T05:17:00Z',
      top: [],
      trending: [
        {
          rank: 1,
          id: 'a',
          name: 'Alpha',
          publisher: 'Pub A',
          image: null,
          move: 'UP',
        },
        {
          rank: 2,
          id: 'b',
          name: 'Beta',
          publisher: 'Pub B',
          image: null,
          move: 'NEW',
        },
      ],
    });
    expect(screen.getByRole('link', { name: /Alpha/ })).toHaveAttribute(
      'href',
      '/podcast/a',
    );
    expect(screen.getByLabelText('Moving up')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Follow: Alpha' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/updated October 4/)).toBeInTheDocument();
  });

  it('explains when charts are missing', () => {
    renderList(null);
    expect(
      screen.getByText('Charts are not available right now.'),
    ).toBeInTheDocument();
  });
});
