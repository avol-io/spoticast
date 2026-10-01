import { render } from '@testing-library/react';
import * as controller from './player-controller';
import * as queue from '../queue/queue';

import PlayerRuntime from './player-runtime';

describe('PlayerRuntime', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts the player, polling and the queue playlist once', () => {
    const init = vi.spyOn(controller, 'initPlayer').mockResolvedValue();
    const stop = vi.fn();
    vi.spyOn(controller, 'startPolling').mockReturnValue(stop);
    const ensure = vi
      .spyOn(queue, 'ensureQueuePlaylist')
      .mockResolvedValue('pl');
    vi.spyOn(queue, 'pruneFinishedFromQueue').mockResolvedValue();
    const { unmount } = render(<PlayerRuntime />);
    expect(init).toHaveBeenCalledTimes(1);
    expect(ensure).toHaveBeenCalledTimes(1);
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});
