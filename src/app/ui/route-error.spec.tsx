import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import RouteError, { isStaleChunkError } from './route-error';

function Boom(): never {
  throw new Error('kaboom');
}

describe('RouteError', () => {
  it('offers a reload and shows the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const router = createMemoryRouter([
      { path: '/', element: <Boom />, errorElement: <RouteError /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke');
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('recognizes stale chunk errors from every browser', () => {
    expect(
      isStaleChunkError(
        new TypeError(
          'Failed to fetch dynamically imported module: /assets/x.js',
        ),
      ),
    ).toBe(true);
    expect(
      isStaleChunkError(new TypeError('Importing a module script failed.')),
    ).toBe(true);
    expect(
      isStaleChunkError(new Error('error loading dynamically imported module')),
    ).toBe(true);
    expect(isStaleChunkError(new Error('kaboom'))).toBe(false);
  });
});
