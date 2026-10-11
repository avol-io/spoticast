import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Episode } from '../../lib/spotify/types';
import { queueKey, type QueueData } from '../queue/queue';
import type { NowPlaying } from './playback';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import MiniPlayer from './mini-player';

const np = {
  uri: 'spotify:episode:e',
  name: 'Episode title',
  showName: 'The Show',
  durationMs: 100_000,
  positionMs: 50_000,
  updatedAt: Date.now(),
  paused: true,
  isLocal: false,
  deviceName: 'Kitchen speaker',
} as NowPlaying;

describe('MiniPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ nowPlaying: null, fullPlayerOpen: false });
  });

  const renderMini = (episodes: Episode[] = []) => {
    const client = new QueryClient();
    client.setQueryData<QueueData>(queueKey, { episodes, otherCount: 0 });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <MiniPlayer />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('says nothing is playing when Up Next is empty', () => {
    renderMini();
    expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Choose a device' }),
    ).toBeInTheDocument();
  });

  it('offers the head of Up Next when nothing plays', async () => {
    const toggle = vi.spyOn(controller, 'togglePlay').mockResolvedValue();
    renderMini([
      {
        uri: 'spotify:episode:q',
        name: 'Queued episode',
        duration_ms: 100_000,
        images: [],
        show: { name: 'Queued show', images: [] },
      } as unknown as Episode,
    ]);
    expect(screen.getByText('Queued episode')).toBeInTheDocument();
    expect(screen.getByText('Up Next · Queued show')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(toggle).toHaveBeenCalled();
  });

  it('shows the remote device and controls playback', async () => {
    usePlayer.setState({ nowPlaying: np });
    const toggle = vi.spyOn(controller, 'togglePlay').mockResolvedValue();
    const skip = vi.spyOn(controller, 'skip').mockResolvedValue();
    renderMini();
    expect(screen.getByText('Playing on Kitchen speaker')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(toggle).toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Forward 30 seconds' }),
    );
    expect(skip).toHaveBeenCalledWith(30);
    await userEvent.click(
      screen.getByRole('button', { name: /Open player:\s*Episode title/ }),
    );
    expect(usePlayer.getState().fullPlayerOpen).toBe(true);
  });
});
