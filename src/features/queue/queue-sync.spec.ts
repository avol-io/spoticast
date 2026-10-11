import { queueDrift, upcoming } from './queue-sync';

describe('upcoming', () => {
  it('returns what follows the current episode', () => {
    expect(upcoming(['a', 'b', 'c'], 'a')).toEqual(['b', 'c']);
  });

  it('returns the whole list when the current episode is not in it', () => {
    expect(upcoming(['b', 'c'], 'a')).toEqual(['b', 'c']);
  });
});

describe('queueDrift', () => {
  const loaded = ['a', 'b', 'c', 'd'];

  it('is none when the order after the current episode is the same', () => {
    expect(queueDrift(loaded, ['a', 'b', 'c', 'd'], 'a')).toBe('none');
  });

  it('ignores episodes removed before the current one', () => {
    expect(queueDrift(loaded, ['b', 'c', 'd'], 'b')).toBe('none');
    expect(queueDrift(loaded, ['c', 'd'], 'b')).toBe('none');
  });

  it('is now when the next episode changed', () => {
    expect(queueDrift(loaded, ['a', 'c', 'b', 'd'], 'a')).toBe('now');
    expect(queueDrift(loaded, ['a', 'x', 'b', 'c', 'd'], 'a')).toBe('now');
    expect(queueDrift(loaded, ['a', 'c', 'd'], 'a')).toBe('now');
  });

  it('is now when the queue after the current episode emptied', () => {
    expect(queueDrift(loaded, ['a'], 'a')).toBe('now');
  });

  it('is later when only episodes further down changed', () => {
    expect(queueDrift(loaded, ['a', 'b', 'd', 'c'], 'a')).toBe('later');
    expect(queueDrift(loaded, ['a', 'b', 'c', 'd', 'x'], 'a')).toBe('later');
    expect(queueDrift(loaded, ['a', 'b', 'c'], 'a')).toBe('later');
  });
});
