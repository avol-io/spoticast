import { registerSW, type RegisterSWOptions } from 'virtual:pwa-register';
import { registerServiceWorker } from './register';
import { applyUpdate, resetUpdate, useUpdate } from './update';

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }));

describe('registerServiceWorker', () => {
  afterEach(() => resetUpdate());

  it('wires the plugin callbacks to the update store', async () => {
    const updateSW = vi.fn().mockResolvedValue(undefined);
    let options: RegisterSWOptions = {};
    vi.mocked(registerSW).mockImplementation((o) => {
      options = o ?? {};
      return updateSW;
    });
    registerServiceWorker();

    options.onRegisteredSW?.('/sw.js', {
      installing: null,
      update: vi.fn(),
    } as unknown as ServiceWorkerRegistration);
    expect(useUpdate.getState().available).toBe(true);

    options.onNeedRefresh?.();
    expect(useUpdate.getState().needRefresh).toBe(true);

    await applyUpdate();
    expect(updateSW).toHaveBeenCalledWith(true);
  });
});
