import { queryClient } from '../../lib/query/query-client';
import * as endpoints from '../../lib/spotify/endpoints';
import type { SavedEpisode } from '../../lib/spotify/types';
import { applyMirror } from './your-episodes';

describe('applyMirror', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('adds and removes through the library endpoints', async () => {
    const save = vi.spyOn(endpoints, 'saveToLibrary').mockResolvedValue();
    const remove = vi.spyOn(endpoints, 'removeFromLibrary').mockResolvedValue();
    vi.spyOn(endpoints, 'getSavedEpisodes').mockResolvedValue([]);
    await applyMirror({
      toAdd: ['spotify:episode:new'],
      toRemove: [{ episode: { uri: 'spotify:episode:old' } } as SavedEpisode],
    });
    expect(save).toHaveBeenCalledWith(['spotify:episode:new']);
    expect(remove).toHaveBeenCalledWith(['spotify:episode:old']);
  });
});
