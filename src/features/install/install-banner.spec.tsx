import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useInstall } from '../../lib/pwa/install';

import InstallBanner from './install-banner';

describe('InstallBanner', () => {
  afterEach(() => useInstall.setState({ prompt: null, installed: false }));

  const renderBanner = (path = '/') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <InstallBanner />
      </MemoryRouter>,
    );

  it('links to the how-to page until dismissed for a while', async () => {
    const { unmount } = renderBanner();
    expect(screen.getByRole('link', { name: 'Show me' })).toHaveAttribute(
      'href',
      '/install',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Install Spoticast')).not.toBeInTheDocument();
    unmount();
    renderBanner();
    expect(screen.queryByText('Install Spoticast')).not.toBeInTheDocument();
  });

  it('stays hidden once installed and on the how-to page', () => {
    renderBanner('/install');
    expect(screen.queryByText('Install Spoticast')).not.toBeInTheDocument();
    useInstall.setState({ installed: true });
    renderBanner();
    expect(screen.queryByText('Install Spoticast')).not.toBeInTheDocument();
  });
});
