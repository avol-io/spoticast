import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePlayer } from '../../features/player/player-store';

import StatusBanners from './status-banners';

describe('StatusBanners', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ sdkError: undefined });
    sessionStorage.clear();
  });

  it('shows the offline notice while offline', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<StatusBanners />);
    expect(
      screen.getByText('You are offline: showing saved data.'),
    ).toBeInTheDocument();
    online.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(
      screen.queryByText('You are offline: showing saved data.'),
    ).not.toBeInTheDocument();
  });

  it('explains the Premium requirement until dismissed', async () => {
    usePlayer.setState({ sdkError: 'player.premiumRequired' });
    render(<StatusBanners />);
    expect(screen.getByText(/needs Spotify Premium/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/needs Spotify Premium/)).not.toBeInTheDocument();
  });
});
