import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Episode } from '../../lib/spotify/types';
import * as archive from '../archive/use-archive';
import * as queue from '../queue/queue';
import { useSelection } from '../selection/selection-store';

import EpisodeSwipeRow from './episode-swipe-row';

const episode = {
  id: 'e',
  uri: 'spotify:episode:e',
  name: 'Episode e',
  resume_point: { fully_played: false, resume_position_ms: 0 },
} as Episode;

describe('EpisodeSwipeRow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useSelection.getState().clear();
  });

  const reveal = () => {
    const content = screen.getByText('Row');
    fireEvent.pointerDown(content, { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(content, { pointerId: 1, clientX: 250 });
    fireEvent.pointerMove(content, { pointerId: 1, clientX: 0 });
    fireEvent.pointerUp(content, { pointerId: 1 });
  };

  it('offers play next, play last and archive', async () => {
    const add = vi.spyOn(queue, 'addToQueue').mockResolvedValue();
    const archiveOne = vi
      .spyOn(archive, 'archiveEpisode')
      .mockReturnValue(undefined);
    render(
      <EpisodeSwipeRow
        episode={episode}
        selecting={false}
        onStartSelection={vi.fn()}
      >
        <p>Row</p>
      </EpisodeSwipeRow>,
    );
    expect(
      screen.queryByRole('button', {
        name: 'Remove from Up Next',
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    reveal();
    await userEvent.click(screen.getByRole('button', { name: 'Play next' }));
    expect(add).toHaveBeenCalledWith(episode, 'next', undefined);
    reveal();
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(archiveOne).toHaveBeenCalledWith(episode);
  });

  it('can remove from Up Next in the queue', () => {
    render(
      <EpisodeSwipeRow
        episode={episode}
        inQueue
        selecting={false}
        onStartSelection={vi.fn()}
      >
        <p>Row</p>
      </EpisodeSwipeRow>,
    );
    expect(
      screen.getByRole('button', { name: 'Remove from Up Next', hidden: true }),
    ).toBeInTheDocument();
  });

  it('toggles its selection while selecting', async () => {
    useSelection.getState().start('list');
    render(
      <EpisodeSwipeRow episode={episode} selecting onStartSelection={vi.fn()}>
        <p>Row</p>
      </EpisodeSwipeRow>,
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Episode e' }),
    );
    expect(useSelection.getState().selected).toEqual(['spotify:episode:e']);
  });
});
