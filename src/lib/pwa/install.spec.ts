import {
  isIos,
  listenForInstallPrompt,
  promptInstall,
  useInstall,
} from './install';

describe('install prompt', () => {
  it('captures the browser prompt and installs on demand', async () => {
    listenForInstallPrompt();
    const event = Object.assign(
      new Event('beforeinstallprompt', { cancelable: true }),
      {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      },
    );
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(useInstall.getState().prompt).toBe(event);
    expect(await promptInstall()).toBe(true);
    expect(useInstall.getState()).toMatchObject({
      prompt: null,
      installed: true,
    });
  });

  it('recognizes iOS devices', () => {
    expect(
      isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'),
    ).toBe(true);
    expect(isIos('Mozilla/5.0 (Linux; Android 15)')).toBe(false);
  });
});
