import { useFilters } from './filters';

describe('filters store', () => {
  it('migrates smart lists saved before sync', async () => {
    localStorage.setItem(
      'spoticast.filters',
      JSON.stringify({
        version: 1,
        state: {
          podcast: {},
          presets: [],
          smartLists: [{ id: 'l1', name: 'Quick', playlistId: 'pl' }],
        },
      }),
    );
    await useFilters.persist.rehydrate();
    expect(useFilters.getState().smartLists[0]).toMatchObject({
      id: 'l1',
      playlistId: 'pl',
      playlistDescription: null,
      updatedAt: 0,
    });
  });

  it('stamps user edits but keeps the time of synced copies', () => {
    vi.spyOn(Date, 'now').mockReturnValue(42);
    const list = { id: 'l2', name: 'A', updatedAt: 7 } as never;
    expect(useFilters.getState().saveSmartList(list).updatedAt).toBe(42);
    useFilters.getState().applyRemoteSmartList(list);
    expect(
      useFilters.getState().smartLists.find((l) => l.id === 'l2')?.updatedAt,
    ).toBe(7);
    vi.restoreAllMocks();
  });
});
