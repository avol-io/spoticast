import type { Meta, StoryObj } from '@storybook/react-vite';
import FullPlayer from './full-player';
import type { NowPlaying } from './playback';
import { usePlayer } from './player-store';

const nowPlaying: NowPlaying = {
  uri: 'spotify:episode:e1',
  id: 'e1',
  type: 'episode',
  name: 'Episodio 80: il futuro dell’IA',
  showName: 'Tech Talk Daily',
  durationMs: 54 * 60_000,
  positionMs: 18 * 60_000,
  updatedAt: Date.now(),
  paused: true,
  contextUri: null,
  deviceId: 'web',
  deviceName: 'Spoticast',
  isLocal: true,
  video: false,
};

const meta = {
  component: FullPlayer,
  title: 'Player/FullPlayer',
} satisfies Meta<typeof FullPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InThisBrowser: Story = {
  beforeEach: () => {
    usePlayer.setState({ nowPlaying, fullPlayerOpen: true });
    return () =>
      usePlayer.setState({ nowPlaying: null, fullPlayerOpen: false });
  },
};

export const OnAnotherDevice: Story = {
  beforeEach: () => {
    usePlayer.setState({
      nowPlaying: { ...nowPlaying, isLocal: false, deviceName: 'Cucina' },
      fullPlayerOpen: true,
    });
    return () =>
      usePlayer.setState({ nowPlaying: null, fullPlayerOpen: false });
  },
};
