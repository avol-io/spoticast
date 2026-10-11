import { render } from '@testing-library/react';
import * as smartLists from './smart-lists';

import SmartPlaylistsRuntime, {
  resetSmartPlaylistsRuntime,
  SMART_RESYNC_MS,
} from './smart-playlists-runtime';

describe('SmartPlaylistsRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSmartPlaylistsRuntime();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const comeBack = () => {
    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(300);
  };

  it('syncs smart playlists once per app start', () => {
    const sync = vi
      .spyOn(smartLists, 'syncAllSmartPlaylists')
      .mockResolvedValue();
    render(<SmartPlaylistsRuntime />);
    render(<SmartPlaylistsRuntime />);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('syncs again when the app returns after a while', () => {
    const sync = vi
      .spyOn(smartLists, 'syncAllSmartPlaylists')
      .mockResolvedValue();
    const { unmount } = render(<SmartPlaylistsRuntime />);
    comeBack();
    expect(sync).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SMART_RESYNC_MS);
    comeBack();
    expect(sync).toHaveBeenCalledTimes(2);
    unmount();
  });
});
