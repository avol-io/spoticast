import { render } from '@testing-library/react';
import * as smartLists from './smart-lists';

import SmartPlaylistsRuntime from './smart-playlists-runtime';

describe('SmartPlaylistsRuntime', () => {
  it('syncs smart playlists once per app start', () => {
    const sync = vi
      .spyOn(smartLists, 'syncAllSmartPlaylists')
      .mockResolvedValue();
    render(<SmartPlaylistsRuntime />);
    render(<SmartPlaylistsRuntime />);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
