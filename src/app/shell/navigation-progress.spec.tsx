import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import NavigationProgress from './navigation-progress';

describe('NavigationProgress', () => {
  it('is hidden while idle', () => {
    const router = createMemoryRouter([
      { path: '/', element: <NavigationProgress /> },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
