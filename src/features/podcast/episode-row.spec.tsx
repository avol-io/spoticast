import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SimplifiedEpisode } from '../../lib/spotify/types';

import EpisodeRow from './episode-row';

const base = {
  id: 'e1',
  name: 'The episode',
  description: 'Long description',
  duration_ms: 45 * 60_000,
  release_date: '2020-03-01',
  explicit: false,
  images: [],
} as unknown as SimplifiedEpisode;

describe('EpisodeRow', () => {
  it('shows the duration of an unplayed episode', () => {
    render(<EpisodeRow episode={base} />);
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('shows remaining time and progress for an episode in progress', () => {
    render(
      <EpisodeRow
        episode={{
          ...base,
          resume_point: {
            fully_played: false,
            resume_position_ms: 15 * 60_000,
          },
        }}
      />,
    );
    expect(screen.getByText('30m left')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '33',
    );
  });

  it('marks played episodes and expands the description', async () => {
    render(
      <EpisodeRow
        episode={{
          ...base,
          resume_point: { fully_played: true, resume_position_ms: 0 },
        }}
      />,
    );
    expect(screen.getByText('Played')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /the episode/i }));
    expect(screen.getByText('Long description')).toBeInTheDocument();
  });
});
