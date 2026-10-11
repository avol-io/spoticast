import { applyMove, moveRequest, playNextPosition } from './queue-logic';

describe('moveRequest', () => {
  // Simulates Spotify's semantics to check the request against applyMove.
  const spotifyMove = (
    list: string[],
    rangeStart: number,
    insertBefore: number,
  ) => {
    const next = [...list];
    const [item] = next.splice(rangeStart, 1);
    next.splice(
      insertBefore > rangeStart ? insertBefore - 1 : insertBefore,
      0,
      item,
    );
    return next;
  };
  const list = ['a', 'b', 'c', 'd'];

  it.each([
    [0, 2],
    [3, 0],
    [1, 3],
    [2, 1],
  ])('moving %i to %i matches the local reorder', (from, to) => {
    const { rangeStart, insertBefore } = moveRequest(from, to);
    expect(spotifyMove(list, rangeStart, insertBefore)).toEqual(
      applyMove(list, from, to),
    );
  });
});

describe('playNextPosition', () => {
  it('goes after the playing head, else to the top', () => {
    expect(playNextPosition(['a', 'b'], 'a')).toBe(1);
    expect(playNextPosition(['a', 'b'], 'z')).toBe(0);
    expect(playNextPosition([], undefined)).toBe(0);
  });
});
