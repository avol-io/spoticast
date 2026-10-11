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

  it('turns the single status into a list of statuses', async () => {
    const legacy = (status: string) => ({
      minMinutes: null,
      maxMinutes: null,
      withinDays: null,
      status,
      text: '',
      videoOnly: false,
    });
    localStorage.setItem(
      'spoticast.filters',
      JSON.stringify({
        version: 2,
        state: {
          podcast: { s1: legacy('in-progress') },
          presets: [{ id: 'p1', name: 'P', criteria: legacy('any') }],
          smartLists: [
            { id: 'a', criteria: legacy('any'), includeArchived: false },
            { id: 'b', criteria: legacy('any'), includeArchived: true },
            { id: 'c', criteria: legacy('not-started'), includeArchived: true },
          ],
        },
      }),
    );
    await useFilters.persist.rehydrate();
    const state = useFilters.getState();
    expect(state.podcast.s1.statuses).toEqual(['in-progress']);
    expect(state.presets[0].criteria.statuses).toEqual([]);
    expect(state.smartLists.map((l) => l.criteria.statuses)).toEqual([
      ['not-started', 'in-progress'],
      [],
      ['not-started', 'archived'],
    ]);
    expect(state.smartLists[0]).not.toHaveProperty('includeArchived');
    expect(state.smartLists[0].criteria).not.toHaveProperty('status');
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
