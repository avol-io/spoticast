import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../lib/spotify/endpoints';
import type { Device } from '../../lib/spotify/types';
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
  });

  it('lists this browser and other devices, and transfers on tap', async () => {
    usePlayer.setState({ localDeviceId: 'web', sdkStatus: 'ready' });
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
    const transfer = vi.spyOn(controller, 'transferTo').mockResolvedValue();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DeviceList />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole('button', { name: /Pixel/ }),
    ).toHaveAttribute('aria-current', 'true');
    await userEvent.click(screen.getByRole('button', { name: /This browser/ }));
    expect(transfer).toHaveBeenCalledWith('web');
  });
});
