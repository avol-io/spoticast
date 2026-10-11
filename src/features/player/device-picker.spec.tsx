import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as endpoints from '../../lib/spotify/endpoints';
import { useSettings } from '../../lib/storage/settings';
import type { NowPlaying } from './playback';
import { usePlayer } from './player-store';

import DevicePicker from './device-picker';

describe('DevicePicker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ nowPlaying: null, sdkStatus: 'idle' });
    useSettings.setState({ preferredDevice: null });
  });

  const renderPicker = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DevicePicker />
      </QueryClientProvider>,
    );

  it('names the device playing and opens the list', async () => {
    usePlayer.setState({
      nowPlaying: {
        isLocal: false,
        deviceId: 'tv',
        deviceName: 'Living room',
        deviceType: 'TV',
      } as NowPlaying,
    });
    vi.spyOn(endpoints, 'getDevices').mockResolvedValue([]);
    renderPicker();
    await userEvent.click(
      screen.getByRole('button', { name: 'Playback device: Living room' }),
    );
    expect(screen.getByRole('dialog', { name: 'Devices' })).toBeInTheDocument();
  });

  it('names the preferred device when nothing plays', () => {
    useSettings.setState({
      preferredDevice: {
        kind: 'remote',
        id: 'p',
        name: 'Pixel',
        type: 'Smartphone',
      },
    });
    renderPicker();
    expect(
      screen.getByRole('button', { name: 'Playback device: Pixel' }),
    ).toBeInTheDocument();
  });

  it('asks to choose when there is no device yet', () => {
    renderPicker();
    expect(
      screen.getByRole('button', { name: 'Choose a device' }),
    ).toBeInTheDocument();
  });
});
