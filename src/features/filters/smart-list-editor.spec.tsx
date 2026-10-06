import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFilters, type SmartList } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';
import * as smartLists from './smart-lists';

import SmartListEditor, { newSmartList } from './smart-list-editor';

function renderEditor(
  onSaved = vi.fn(),
  list: SmartList = { ...newSmartList(), id: 'l1' },
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.savedShows, [
    { added_at: '', show: { id: 's1', name: 'Tech Talk', images: [] } },
    { added_at: '', show: { id: 's2', name: 'News', images: [] } },
  ]);
  render(
    <QueryClientProvider client={qc}>
      <SmartListEditor list={list} onClose={vi.fn()} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return onSaved;
}

describe('SmartListEditor', () => {
  beforeEach(() => useFilters.setState({ smartLists: [] }));
  afterEach(() => vi.restoreAllMocks());

  it('saves a list limited to chosen podcasts', async () => {
    const onSaved = renderEditor();
    await userEvent.type(screen.getByLabelText('Name'), ' Quick ');
    await userEvent.click(
      screen.getByRole('switch', { name: 'All followed podcasts' }),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tech Talk' }));
    await userEvent.selectOptions(screen.getByLabelText('At most'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(useFilters.getState().smartLists[0]).toMatchObject({
      id: 'l1',
      name: 'Quick',
      showIds: ['s1'],
      criteria: expect.objectContaining({
        maxMinutes: 30,
        status: 'not-started',
      }),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('builds the Spotify playlist when asked', async () => {
    const sync = vi.spyOn(smartLists, 'syncSmartPlaylist').mockResolvedValue();
    renderEditor();
    await userEvent.type(screen.getByLabelText('Name'), 'Morning');
    await userEvent.click(
      screen.getByRole('switch', { name: /Create a playlist on Spotify/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(sync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Morning', spotifyPlaylist: true }),
    );
  });

  it('stamps the edit time so other devices can tell which copy is newer', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const onSaved = renderEditor();
    await userEvent.type(screen.getByLabelText('Name'), 'Quick');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: 1234 }),
    );
  });

  it('warns when the filter is too long to sync through the playlist', () => {
    const base = newSmartList();
    renderEditor(vi.fn(), {
      ...base,
      id: 'l1',
      name: 'Long',
      spotifyPlaylist: true,
      criteria: { ...base.criteria, text: 'x'.repeat(250) },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /stays on this device/,
    );
  });
});
