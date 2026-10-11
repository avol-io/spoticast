import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { episodeKey } from '../episode/open-episode';
import { libraryKeys } from '../library/queries';
import { queueKey, type QueueData } from '../queue/queue';
import { useQueueStore } from '../queue/queue-store';
import type { Episode } from '../../lib/spotify/types';
import type { NowPlaying } from './playback';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import FullPlayer from './full-player';

const np = {
  uri: 'spotify:episode:e',
  id: 'e',
  type: 'episode',
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

let queued: Episode[] = [];

function renderPlayer() {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.show('s1'), { id: 's1', media_type: 'video' });
  qc.setQueryData(['devices'], []);
  qc.setQueryData<QueueData>(queueKey, { episodes: queued, otherCount: 0 });
  qc.setQueryData(episodeKey('e'), {
    id: 'e',
    name: 'Big episode',
    description: '',
    html_description: '<p>Show notes</p>',
    duration_ms: 3_600_000,
    release_date: '2024-01-01',
  });
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
    queued = [];
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

  it('shows the notes and the comments in tabs, controls staying', async () => {
    renderPlayer();
    await userEvent.click(screen.getByRole('tab', { name: 'Details' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Show notes');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Comments' }));
    expect(
      screen.getByRole('link', { name: 'Comment on Spotify' }),
    ).toHaveAttribute('href', 'https://open.spotify.com/episode/e');
  });

  it.each([
    [true, 'This browser', 'Change device'],
    [false, 'Kitchen', 'Kitchen'],
  ])(
    'switches device from the action row icon (local: %s)',
    async (isLocal, name, text) => {
      usePlayer.setState({
        nowPlaying: { ...np, isLocal, deviceName: 'Kitchen' },
      });
      renderPlayer();
      await userEvent.click(
        screen.getByRole('button', { name: `Playback device: ${name}` }),
      );
      expect(
        screen.getByRole('dialog', { name: 'Devices' }),
      ).toBeInTheDocument();
    },
  );

  it('closes when swiped down', () => {
    vi.useFakeTimers();
    renderPlayer();
    const handle = screen.getByRole('button', { name: 'Close player' })
      .parentElement as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { clientY: 300 });
    fireEvent.pointerMove(handle, { clientY: 700 });
    fireEvent.pointerUp(handle, { clientY: 700 });
    act(() => void vi.advanceTimersByTime(300));
    expect(usePlayer.getState().fullPlayerOpen).toBe(false);
    vi.useRealTimers();
  });

  it('shows the head of Up Next before playback and starts it there', async () => {
    const play = vi.spyOn(controller, 'playEpisode').mockResolvedValue();
    const seek = vi.spyOn(controller, 'seekTo').mockResolvedValue();
    queued = [
      {
        id: 'q',
        uri: 'spotify:episode:q',
        name: 'Queued episode',
        duration_ms: 3_600_000,
        images: [],
        resume_point: { fully_played: false, resume_position_ms: 120_000 },
        show: { id: 's1', name: 'Queued show', images: [] },
      } as unknown as Episode,
    ];
    usePlayer.setState({ nowPlaying: null });
    renderPlayer();
    expect(
      screen.getByRole('heading', { name: 'Queued episode' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Position' })).toHaveValue(
      '120000',
    );
    expect(screen.getByRole('button', { name: 'Next episode' })).toBeDisabled();
    // Skipping before playback moves where it starts.
    await userEvent.click(
      screen.getByRole('button', { name: 'Forward 30 seconds' }),
    );
    expect(seek).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(play).toHaveBeenCalledWith(queued[0], { positionMs: 150_000 });
  });
});
