import { onForeground } from './foreground';

describe('onForeground', () => {
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setHidden = (value: boolean) => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('reports how long the app was hidden', () => {
    const callback = vi.fn();
    const stop = onForeground(callback);
    setHidden(true);
    vi.advanceTimersByTime(60_000);
    setHidden(false);
    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledWith({
      hiddenMs: 60_000,
      reason: 'visible',
    });
    stop();
  });

  it('merges events that come together, keeping the longest absence', () => {
    const callback = vi.fn();
    const stop = onForeground(callback);
    setHidden(true);
    vi.advanceTimersByTime(10_000);
    setHidden(false);
    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ hiddenMs: 10_000 }),
    );
    stop();
  });

  it('stops listening on cleanup', () => {
    const callback = vi.fn();
    onForeground(callback)();
    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });
});
