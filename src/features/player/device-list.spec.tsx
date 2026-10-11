import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Device } from '../../lib/spotify/types';
import { useSettings } from '../../lib/storage/settings';
import type { NowPlaying } from './playback';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import DeviceList from './device-list';

describe('DeviceList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({
      localDeviceId: undefined,
      sdkStatus: 'idle',
      nowPlaying: null,
    });
    useSettings.setState({ preferredDevice: null });
  });

  const mockDevices = () =>
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([
      {
        id: 'web',
        name: 'Spoticast',
        type: 'Computer',
        is_active: false,
      } as Device,
      {
        id: 'phone',
        name: 'Pixel',
        type: 'Smartphone',
        is_active: true,
      } as Device,
    ]);
  const renderList = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DeviceList />
      </QueryClientProvider>,
    );

  it('moves what is playing and remembers the choice', async () => {
    usePlayer.setState({
      localDeviceId: 'web',
      sdkStatus: 'ready',
      nowPlaying: { deviceId: 'phone' } as NowPlaying,
    });
    mockDevices();
    const transfer = vi.spyOn(controller, 'transferTo').mockResolvedValue();
    renderList();
    expect(
      await screen.findByRole('button', { name: /Pixel/ }),
    ).toHaveAttribute('aria-current', 'true');
    const here = screen.getByRole('button', { name: /This browser/ });
    // Named as Spotify Connect sees it, with the app icon.
    expect(here).toHaveTextContent(/^Spoticast/);
    expect(here.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('logo'),
    );
    await userEvent.click(here);
    expect(transfer).toHaveBeenCalledWith('web');
    expect(useSettings.getState().preferredDevice).toEqual({ kind: 'local' });
  });

  it('only sets the preference when nothing is loaded', async () => {
    usePlayer.setState({ localDeviceId: 'web', sdkStatus: 'ready' });
    useSettings.setState({ preferredDevice: { kind: 'local' } });
    mockDevices();
    const transfer = vi.spyOn(controller, 'transferTo').mockResolvedValue();
    renderList();
    expect(
      await screen.findByRole('button', { name: /This browser/ }),
    ).toHaveAttribute('aria-current', 'true');
    await userEvent.click(await screen.findByRole('button', { name: /Pixel/ }));
    expect(transfer).not.toHaveBeenCalled();
    expect(useSettings.getState().preferredDevice).toEqual({
      kind: 'remote',
      id: 'phone',
      name: 'Pixel',
      type: 'Smartphone',
    });
  });
});
