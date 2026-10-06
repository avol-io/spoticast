import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('is hidden when nothing plays', () => {
    const { container } = render(<MiniPlayer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the remote device and controls playback', async () => {
    usePlayer.setState({ nowPlaying: np });
    const toggle = vi.spyOn(controller, 'togglePlay').mockResolvedValue();
    const skip = vi.spyOn(controller, 'skip').mockResolvedValue();
    render(<MiniPlayer />);
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
