import { act, renderHook } from '@testing-library/react';
import { useSettings } from '../../lib/storage/settings';
import { useApplyPreferences } from './use-apply-preferences';

function stubScheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark && query.includes('dark'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe('useApplyPreferences', () => {
  beforeEach(() => useSettings.setState({ theme: 'auto' }));
  afterEach(() => vi.restoreAllMocks());

  it('follows the system scheme by default', () => {
    expect(useSettings.getInitialState().theme).toBe('auto');
    stubScheme(false);
    renderHook(() => useApplyPreferences());
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies an explicit choice over the system scheme', () => {
    stubScheme(false);
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    renderHook(() => useApplyPreferences());
    act(() => useSettings.getState().setTheme('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#0f1115');
    meta.remove();
  });
});
