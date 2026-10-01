import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryClient } from '../../lib/query/query-client';
import * as yourEpisodes from '../library/your-episodes';
import { queueKey } from './queue';

import SyncDialog from './sync-dialog';

describe('SyncDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('lists the episodes that will be removed and applies the plan', async () => {
    queryClient.setQueryData(queueKey, {
      episodes: [{ uri: 'spotify:episode:q', name: 'Queued' }],
      otherCount: 0,
    });
    queryClient.setQueryData(yourEpisodes.savedEpisodesKey, [
      {
        added_at: '',
        episode: {
          uri: 'spotify:episode:old',
          name: 'Old one',
          show: { name: 'Pod' },
        },
      },
    ]);
    const apply = vi.spyOn(yourEpisodes, 'applyMirror').mockResolvedValue();
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <SyncDialog open onClose={onClose} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('1 episode will be added')).toBeInTheDocument();
    expect(screen.getByText('Old one')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sync' }));
    expect(apply).toHaveBeenCalledWith({
      toAdd: ['spotify:episode:q'],
      toRemove: [
        expect.objectContaining({
          episode: expect.objectContaining({ name: 'Old one' }),
        }),
      ],
    });
    expect(onClose).toHaveBeenCalled();
  });
});
