import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as controller from './player-controller';
import { usePlayer } from './player-store';

import VideoSheet from './video-sheet';

describe('VideoSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    usePlayer.setState({ video: null });
  });

  it('pauses audio, shows the episode and closes', async () => {
    const pause = vi.spyOn(controller, 'pause').mockResolvedValue();
    render(<VideoSheet />);
    act(() =>
      usePlayer
        .getState()
        .setVideo({ uri: 'spotify:episode:v', name: 'Video ep', startAt: 0 }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Video ep' }),
    ).toBeInTheDocument();
    expect(pause).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Close video' }));
    expect(usePlayer.getState().video).toBeNull();
  });
});
