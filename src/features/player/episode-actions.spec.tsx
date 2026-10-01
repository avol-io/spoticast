import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryClient } from '../../lib/query/query-client';
import type { Episode } from '../../lib/spotify/types';
import { savedEpisodesKey } from '../library/your-episodes';
import * as queue from '../queue/queue';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import EpisodeActions from './episode-actions';

const episode = {
  id: 'e1',
  uri: 'spotify:episode:e1',
  name: 'Great episode',
  external_urls: { spotify: 'https://open.spotify.com/episode/e1' },
  resume_point: { fully_played: false, resume_position_ms: 90_000 },
} as Episode;

function renderActions(video = false) {
  queryClient.setQueryData(queue.queueKey, { episodes: [], otherCount: 0 });
  queryClient.setQueryData(savedEpisodesKey, []);
  render(
    <QueryClientProvider client={queryClient}>
      <EpisodeActions episode={episode} video={video} />
    </QueryClientProvider>,
  );
}

describe('EpisodeActions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    usePlayer.setState({ nowPlaying: null, video: null });
  });

  it('plays the episode', async () => {
    const play = vi.spyOn(controller, 'playEpisode').mockResolvedValue();
    renderActions();
    await userEvent.click(
      screen.getByRole('button', { name: 'Play: Great episode' }),
    );
    expect(play).toHaveBeenCalledWith(episode);
  });

  it('adds to Up Next after the playing episode', async () => {
    usePlayer.setState({
      nowPlaying: { uri: 'spotify:episode:now', paused: false } as never,
    });
    const add = vi.spyOn(queue, 'addToQueue').mockResolvedValue();
    renderActions();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Play next' }));
    expect(add).toHaveBeenCalledWith(episode, 'next', 'spotify:episode:now');
  });

  it('opens the video at the resume position for video shows', async () => {
    renderActions(true);
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Watch video' }),
    );
    expect(usePlayer.getState().video).toEqual({
      uri: episode.uri,
      name: episode.name,
      startAt: 90,
    });
  });
});
