import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyCriteria } from '../../lib/filters/engine';
import { useFilters } from '../../lib/storage/filters';

import PodcastFilterSheet from './podcast-filter-sheet';

describe('PodcastFilterSheet', () => {
  beforeEach(() => useFilters.setState({ podcast: {}, presets: [] }));

  it('applies changes live and saves them as a preset', async () => {
    render(<PodcastFilterSheet showId="s1" open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    expect(useFilters.getState().podcast.s1).toMatchObject({ withinDays: 7 });

    await userEvent.type(screen.getByLabelText('Preset name'), 'Recent');
    await userEvent.click(
      screen.getByRole('button', { name: 'Save as preset' }),
    );
    expect(useFilters.getState().presets).toEqual([
      expect.objectContaining({
        name: 'Recent',
        criteria: expect.objectContaining({ withinDays: 7 }),
      }),
    ]);
  });

  it('applies a preset and clears the filter', async () => {
    useFilters.setState({
      presets: [
        {
          id: 'p',
          name: 'Short',
          criteria: { ...emptyCriteria, maxMinutes: 20 },
        },
      ],
    });
    render(<PodcastFilterSheet showId="s1" open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Short' }));
    expect(useFilters.getState().podcast.s1).toMatchObject({ maxMinutes: 20 });
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(useFilters.getState().podcast.s1).toBeUndefined();
  });
});
