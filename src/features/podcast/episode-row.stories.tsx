import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SimplifiedEpisode } from '../../lib/spotify/types';
import { useArchiveStore } from '../archive/archive-store';
import EpisodeRow from './episode-row';

const episode = (overrides: Partial<SimplifiedEpisode> = {}) =>
  ({
    id: 'e1',
    uri: 'spotify:episode:e1',
    name: 'Episodio 80: il futuro dell’intelligenza artificiale',
    description:
      'In questo episodio parliamo di modelli linguistici, lavoro e creatività.',
    duration_ms: 54 * 60_000,
    release_date: new Date().toISOString().slice(0, 10),
    release_date_precision: 'day',
    explicit: false,
    images: [],
    resume_point: { fully_played: false, resume_position_ms: 0 },
    ...overrides,
  }) as SimplifiedEpisode;

const meta = {
  component: EpisodeRow,
  title: 'Podcast/EpisodeRow',
} satisfies Meta<typeof EpisodeRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = { args: { episode: episode() } };
export const InProgress: Story = {
  args: {
    episode: episode({
      resume_point: { fully_played: false, resume_position_ms: 20 * 60_000 },
    }),
  },
};
export const Played: Story = {
  args: {
    episode: episode({
      resume_point: { fully_played: true, resume_position_ms: 0 },
    }),
  },
};
export const ArchivedWaitingForSync: Story = {
  args: { episode: episode({ id: 'pending' }) },
  beforeEach: () => {
    useArchiveStore.setState({
      pending: {
        pending: {
          id: 'pending',
          uri: 'u',
          name: 'x',
          durationMs: 1,
          archivedAt: 0,
          attempts: 0,
        },
      },
    });
    return () => useArchiveStore.setState({ pending: {} });
  },
};
export const VideoExplicitInList: Story = {
  args: {
    episode: episode({ explicit: true }),
    video: true,
    showCover: true,
    eyebrow: 'Tech Talk Daily',
  },
};
