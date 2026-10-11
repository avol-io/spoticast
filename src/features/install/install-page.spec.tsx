import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useInstall } from '../../lib/pwa/install';

import InstallPage from './install-page';

describe('InstallPage', () => {
  afterEach(() => useInstall.setState({ prompt: null, installed: false }));

  const renderPage = () =>
    render(
      <MemoryRouter>
        <InstallPage />
      </MemoryRouter>,
    );

  it('shows the steps of the platform picked', async () => {
    renderPage();
    // jsdom reports neither iOS nor Android.
    expect(screen.getByRole('radio', { name: 'Computer' })).toBeChecked();
    expect(screen.getByText(/^Choose File › Add to Dock/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'iPhone & iPad' }));
    expect(
      screen.getByText('Scroll down, tap “Add to Home Screen”, then Add.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Android' }));
    expect(screen.getByText('Open Spoticast in Chrome.')).toBeInTheDocument();
  });

  it('installs right away when the browser offers it', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    useInstall.setState({
      prompt: {
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      } as never,
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Install now' }));
    expect(prompt).toHaveBeenCalled();
    expect(
      await screen.findByText('Spoticast is installed'),
    ).toBeInTheDocument();
  });
});
