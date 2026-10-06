import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { SimplifiedShow } from '../../lib/spotify/types';

import ShowGrid from './show-grid';

const shows = [
  { id: 'a', name: 'Alpha', images: [] },
  { id: 'b', name: 'Beta', images: [] },
] as unknown as SimplifiedShow[];

function renderGrid(layout: 'grid' | 'list') {
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ShowGrid
          shows={shows}
          layout={layout}
          badges={new Map([['a', { count: 2, more: false }]])}
          latest={new Map()}
        />
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
}

describe('ShowGrid', () => {
  it('links every show to its detail with an accessible label', () => {
    renderGrid('grid');
    expect(
      screen.getByRole('link', { name: 'Alpha, 2 episodes to listen to' }),
    ).toHaveAttribute('href', '/podcast/a');
    expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute(
      'href',
      '/podcast/b',
    );
  });

  it('renders names in the list layout', () => {
    renderGrid('list');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});

describe('ShowGrid (custom order)', () => {
  it('loads the sortable grid with draggable items', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <ShowGrid
            shows={shows}
            layout="grid"
            badges={new Map()}
            latest={new Map()}
            onReorder={vi.fn()}
          />
        ),
      },
    ]);
    render(<RouterProvider router={router} />);
    const items = await screen.findAllByRole('button', { name: /Alpha|Beta/ });
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('aria-roledescription', 'sortable');
  });
});
