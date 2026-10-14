import { usePositions } from './positions';

describe('positions store', () => {
  afterEach(() => usePositions.setState({ positions: {} }));

  it('remembers and forgets positions', () => {
    usePositions.getState().remember('a', 1234.6);
    expect(usePositions.getState().positions.a.ms).toBe(1235);
    usePositions.getState().forget('a');
    expect(usePositions.getState().positions).toEqual({});
  });

  it('keeps only the most recent 50', () => {
    vi.useFakeTimers({ now: 0, toFake: ['Date'] });
    for (let i = 0; i < 55; i++) {
      vi.setSystemTime(i);
      usePositions.getState().remember(`u${i}`, i);
    }
    vi.useRealTimers();
    const { positions } = usePositions.getState();
    expect(Object.keys(positions)).toHaveLength(50);
    expect(positions.u0).toBeUndefined();
    expect(positions.u54.ms).toBe(54);
  });
});
