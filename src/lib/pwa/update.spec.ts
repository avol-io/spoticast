import {
  applyUpdate,
  checkForUpdate,
  dismissUpdate,
  markUpdateReady,
  resetUpdate,
  UPDATE_INTERVAL_MS,
  useUpdate,
  watchForUpdates,
} from './update';

function fakeRegistration(
  overrides: Partial<ServiceWorkerRegistration> = {},
): ServiceWorkerRegistration {
  return {
    installing: null,
    waiting: null,
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

describe('update', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
    resetUpdate();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('checks every hour, on return to the foreground and when back online', () => {
    vi.useFakeTimers();
    const reg = fakeRegistration();
    stop = watchForUpdates(reg, vi.fn());
    expect(useUpdate.getState().available).toBe(true);

    vi.advanceTimersByTime(UPDATE_INTERVAL_MS);
    expect(reg.update).toHaveBeenCalledTimes(1);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(reg.update).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('online'));
    expect(reg.update).toHaveBeenCalledTimes(3);
  });

  it('skips checks while offline or while a worker is installing', () => {
    vi.useFakeTimers();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const reg = fakeRegistration();
    stop = watchForUpdates(reg, vi.fn());
    vi.advanceTimersByTime(UPDATE_INTERVAL_MS);
    expect(reg.update).not.toHaveBeenCalled();

    online.mockReturnValue(true);
    stop();
    const installing = fakeRegistration({
      installing: {} as ServiceWorker,
    });
    stop = watchForUpdates(installing, vi.fn());
    vi.advanceTimersByTime(UPDATE_INTERVAL_MS);
    expect(installing.update).not.toHaveBeenCalled();
  });

  it('reports the outcome of a manual check', async () => {
    const reg = fakeRegistration();
    stop = watchForUpdates(reg, vi.fn());
    await checkForUpdate();
    expect(useUpdate.getState()).toMatchObject({
      checking: false,
      lastCheck: 'upToDate',
    });

    (reg.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('offline'),
    );
    await checkForUpdate();
    expect(useUpdate.getState().lastCheck).toBe('error');

    Object.assign(reg, { waiting: {} });
    await checkForUpdate();
    expect(useUpdate.getState()).toMatchObject({
      needRefresh: true,
      lastCheck: undefined,
    });
  });

  it('marks the update as ready and lets the user dismiss or apply it', async () => {
    const activate = vi.fn().mockResolvedValue(undefined);
    stop = watchForUpdates(fakeRegistration(), activate);
    markUpdateReady();
    expect(useUpdate.getState().needRefresh).toBe(true);
    dismissUpdate();
    expect(useUpdate.getState().dismissed).toBe(true);
    await applyUpdate();
    expect(activate).toHaveBeenCalled();
  });

  it('names the waiting version from the deployed version.json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: 'v9.0.0',
          releaseUrl:
            'https://github.com/avol-io/spoticast/releases/tag/v9.0.0',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    markUpdateReady();
    await vi.waitFor(() =>
      expect(useUpdate.getState().next).toEqual({
        version: 'v9.0.0',
        releaseUrl: 'https://github.com/avol-io/spoticast/releases/tag/v9.0.0',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith('/version.json', {
      cache: 'no-store',
    });
  });

  it('keeps the generic message when version.json is stale or missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: __APP_BUILD__.version })),
      )
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    markUpdateReady();
    markUpdateReady();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r));
    expect(useUpdate.getState()).toMatchObject({
      needRefresh: true,
      next: undefined,
    });
  });
});
