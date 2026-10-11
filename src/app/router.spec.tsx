import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { LegacyPlaylistRedirect } from './router';

describe('LegacyPlaylistRedirect', () => {
  it('sends old smart filter links to the smart playlist', async () => {
    const router = createMemoryRouter(
      [
        { path: '/filters/:filterId', element: <LegacyPlaylistRedirect /> },
        { path: '/playlists/:filterId', element: <p>playlist</p> },
      ],
      { initialEntries: ['/filters/l1'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('playlist')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/playlists/l1');
  });
});
