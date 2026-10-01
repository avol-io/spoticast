import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { libraryKeys } from '../library/queries';
import { useQueueStore } from '../queue/queue-store';
import type { NowPlaying } from './playback';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import FullPlayer from './full-player';

const np = {
  uri: 'spotify:episode:e',
  name: 'Big episode',
  showName: 'Video Show',
  showId: 's1',
  durationMs: 3_600_000,
  positionMs: 60_000,
  updatedAt: Date.now(),
  paused: true,
  isLocal: true,
  deviceName: 'Spoticast',
  video: false,
} as NowPlaying;

function renderPlayer() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.show('s1'), { id: 's1', media_type: 'video' });
  const router = createMemoryRouter([{ path: '/', element: <FullPlayer /> }]);
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('FullPlayer', () => {
  beforeEach(() => {
    usePlayer.setState({ nowPlaying: np, fullPlayerOpen: true, video: null });
    useQueueStore.setState({ playlistId: 'pl' });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ nowPlaying: null, fullPlayerOpen: false });
  });

  it('shows the episode with controls and a link to the show', async () => {
    const skip = vi.spyOn(controller, 'skip').mockResolvedValue();
    renderPlayer();
    expect(
      screen.getByRole('heading', { name: 'Big episode' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Video Show' })).toHaveAttribute(
      'href',
      '/podcast/s1',
    );
    expect(screen.getByRole('slider', { name: 'Position' })).toHaveValue(
      '60000',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Back 10 seconds' }),
    );
    expect(skip).toHaveBeenCalledWith(-10);
  });

  it('offers the video for video shows and "Continue in Spotify"', async () => {
    const switchSpy = vi
      .spyOn(controller, 'switchToSpotify')
      .mockResolvedValue();
    renderPlayer();
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue in Spotify' }),
    );
    expect(switchSpy).toHaveBeenCalledWith('pl');
    await userEvent.click(screen.getByRole('button', { name: 'Watch video' }));
    expect(usePlayer.getState().video?.uri).toBe('spotify:episode:e');
  });
});
