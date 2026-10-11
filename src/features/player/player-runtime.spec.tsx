import { render, waitFor } from '@testing-library/react';
import * as archive from '../archive/archive-playlist';
import * as controller from './player-controller';
import * as queue from '../queue/queue';

import PlayerRuntime from './player-runtime';

describe('PlayerRuntime', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts the player, polling, the archive and the queue playlist once', async () => {
    const init = vi.spyOn(controller, 'initPlayer').mockResolvedValue();
    const stop = vi.fn();
    vi.spyOn(controller, 'startPolling').mockReturnValue(stop);
    const stopWatching = vi.fn();
    vi.spyOn(controller, 'watchQueue').mockReturnValue(stopWatching);
    const ensure = vi
      .spyOn(queue, 'ensureQueuePlaylist')
      .mockResolvedValue('pl');
    vi.spyOn(queue, 'pruneFinishedFromQueue').mockResolvedValue();
    const sync = vi.spyOn(archive, 'syncArchive').mockResolvedValue();
    const { unmount } = render(<PlayerRuntime />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
    // The archive comes first, so pruning Up Next sees it.
    await waitFor(() => expect(ensure).toHaveBeenCalledTimes(1));
    unmount();
    expect(stop).toHaveBeenCalled();
    expect(stopWatching).toHaveBeenCalled();
  });
});
