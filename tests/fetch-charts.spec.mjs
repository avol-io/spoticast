import { normalize } from '../scripts/fetch-charts.mjs';

describe('normalize', () => {
  it('keeps rank, id, name, publisher, image and move', () => {
    expect(
      normalize([
        {
          showUri: 'spotify:show:abc',
          showName: 'Show',
          showPublisher: 'Pub',
          showImageUrl: 'img',
          showDescription: 'long text',
          chartRankMove: 'UP',
        },
        { showUri: 'spotify:episode:x' },
        null,
        { showUri: 'spotify:show:def' },
      ]),
    ).toEqual([
      {
        rank: 1,
        id: 'abc',
        name: 'Show',
        publisher: 'Pub',
        image: 'img',
        move: 'UP',
      },
      {
        rank: 2,
        id: 'def',
        name: '',
        publisher: '',
        image: null,
        move: 'UNCHANGED',
      },
    ]);
  });
});
