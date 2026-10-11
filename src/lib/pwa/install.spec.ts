import {
  canInstall,
  desktopBrowser,
  installPlatform,
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

  it('tells the platform and the desktop browser apart', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
    const safari =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
    const firefox =
      'Mozilla/5.0 (Windows NT 10.0; rv:143.0) Gecko/20100101 Firefox/143.0';
    expect(installPlatform('Mozilla/5.0 (Linux; Android 15)')).toBe('android');
    expect(installPlatform(chrome)).toBe('desktop');
    expect(desktopBrowser(chrome)).toBe('chromium');
    expect(desktopBrowser(safari)).toBe('safari');
    expect(desktopBrowser(firefox)).toBe('firefox');
    expect(canInstall(false, firefox)).toBe(false);
    expect(canInstall(true, firefox)).toBe(true);
    expect(canInstall(false, safari)).toBe(true);
  });
});
