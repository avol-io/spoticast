import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFilters } from '../../lib/storage/filters';
import { libraryKeys } from '../library/queries';
import * as smartLists from './smart-lists';

import SmartListEditor, { newSmartList } from './smart-list-editor';

function renderEditor(onSaved = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  qc.setQueryData(libraryKeys.savedShows, [
    { added_at: '', show: { id: 's1', name: 'Tech Talk', images: [] } },
    { added_at: '', show: { id: 's2', name: 'News', images: [] } },
  ]);
  render(
    <QueryClientProvider client={qc}>
      <SmartListEditor
        list={{ ...newSmartList(), id: 'l1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
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
});
