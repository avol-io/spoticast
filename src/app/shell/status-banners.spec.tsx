import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NowPlaying } from '../../features/player/playback';
import { usePlayer } from '../../features/player/player-store';
import * as update from '../../lib/pwa/update';

import StatusBanners from './status-banners';

describe('StatusBanners', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => {
      usePlayer.setState({ sdkError: undefined, nowPlaying: null });
      update.resetUpdate();
    });
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

  it('offers the new version, held back while audio plays here', async () => {
    const apply = vi.spyOn(update, 'applyUpdate').mockResolvedValue();
    usePlayer.setState({
      localDeviceId: 'here',
      nowPlaying: { paused: false, deviceId: 'here' } as NowPlaying,
    });
    update.markUpdateReady();
    render(<StatusBanners />);
    expect(screen.queryByText(/new version/)).not.toBeInTheDocument();

    act(() =>
      usePlayer.setState({
        nowPlaying: { paused: true, deviceId: 'here' } as NowPlaying,
      }),
    );
    expect(screen.getByText(/new version/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(apply).toHaveBeenCalled();
  });

  it('hides the update banner once dismissed', async () => {
    update.markUpdateReady();
    render(<StatusBanners />);
    const banner = screen.getByText(/new version/).parentElement as HTMLElement;
    await userEvent.click(
      within(banner).getByRole('button', { name: 'Dismiss' }),
    );
    expect(screen.queryByText(/new version/)).not.toBeInTheDocument();
  });
});
