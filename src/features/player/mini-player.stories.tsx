import type { Meta, StoryObj } from '@storybook/react-vite';
import type { NowPlaying } from './playback';
import { usePlayer } from './player-store';
import MiniPlayer from './mini-player';

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
  component: MiniPlayer,
  title: 'Player/MiniPlayer',
} satisfies Meta<typeof MiniPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InThisBrowser: Story = {
  beforeEach: () => {
    usePlayer.setState({ nowPlaying });
    return () => usePlayer.setState({ nowPlaying: null });
  },
};

export const OnAnotherDevice: Story = {
  beforeEach: () => {
    usePlayer.setState({
      nowPlaying: {
        ...nowPlaying,
        isLocal: false,
        deviceName: 'Cucina',
        paused: false,
      },
    });
    return () => usePlayer.setState({ nowPlaying: null });
  },
};
