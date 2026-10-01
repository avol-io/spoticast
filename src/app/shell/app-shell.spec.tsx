import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import AppShell from './app-shell';

describe('AppShell', () => {
  it('renders the routed page inside both navigations', () => {
    const router = createMemoryRouter([
      {
        element: <AppShell />,
        children: [{ index: true, element: <p>Home content</p> }],
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.getByText('Home content')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });
});
