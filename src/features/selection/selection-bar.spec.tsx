import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Episode } from '../../lib/spotify/types';
import * as archive from '../archive/use-archive';
import * as addSheet from '../filters/add-to-playlist-sheet';
import * as manual from '../filters/manual-playlists';
import * as queue from '../queue/queue';
import { useSelection, type SelectionKind } from './selection-store';

import SelectionBar from './selection-bar';

const ep = (id: string) =>
  ({ id, uri: `spotify:episode:${id}`, name: id }) as Episode;

describe('SelectionBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useSelection.getState().clear();
  });

  const select = (kind: SelectionKind, uris: string[]) => {
    useSelection.getState().start('list', uris[0]);
    useSelection.getState().register('list', kind, [ep('a'), ep('b'), ep('c')]);
    for (const uri of uris.slice(1)) useSelection.getState().toggle(uri);
  };

  it('is hidden outside selection mode', () => {
    const { container } = render(<SelectionBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('queues the selected episodes in list order and leaves selection', async () => {
    const insert = vi.spyOn(queue, 'insertIntoQueue').mockResolvedValue();
    select('episodes', ['spotify:episode:c', 'spotify:episode:a']);
    render(<SelectionBar />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove from Up Next' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play last' }));
    expect(insert.mock.calls[0][0].map((e) => e.id)).toEqual(['a', 'c']);
    expect(insert.mock.calls[0][1]).toBe('last');
    expect(useSelection.getState().scope).toBeNull();
  });

  it('selects everything and archives it', async () => {
    const archiveMany = vi
      .spyOn(archive, 'archiveEpisodes')
      .mockReturnValue(undefined);
    select('episodes', ['spotify:episode:a']);
    render(<SelectionBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(archiveMany.mock.calls[0][0]).toHaveLength(3);
  });

  it('removes from Up Next in the queue', async () => {
    const remove = vi.spyOn(queue, 'removeManyFromQueue').mockResolvedValue();
    select('queue', ['spotify:episode:b']);
    render(<SelectionBar />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove from Up Next' }),
    );
    expect(remove).toHaveBeenCalledWith(['spotify:episode:b']);
  });

  it('leaves selection on Escape', async () => {
    select('episodes', ['spotify:episode:a']);
    render(<SelectionBar />);
    await userEvent.keyboard('{Escape}');
    expect(useSelection.getState().scope).toBeNull();
  });

  it('adds the selection to a playlist', async () => {
    const open = vi.spyOn(addSheet, 'openAddToPlaylist');
    select('episodes', ['spotify:episode:b']);
    render(<SelectionBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Playlist' }));
    expect(open.mock.calls[0][0].map((e) => e.id)).toEqual(['b']);
  });

  it('removes from the manual playlist being shown', async () => {
    const playlist = { id: 'p1', uri: 'spotify:playlist:p1', name: 'Later' };
    const remove = vi
      .spyOn(manual, 'removeFromManualPlaylist')
      .mockResolvedValue();
    select({ playlist }, ['spotify:episode:a', 'spotify:episode:c']);
    render(<SelectionBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(remove).toHaveBeenCalledWith(playlist, [
      'spotify:episode:a',
      'spotify:episode:c',
    ]);
  });
});
