import { dominantFromPixels } from './dominant';

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe('dominantFromPixels', () => {
  it('returns a tint of a solid color', () => {
    expect(
      dominantFromPixels(pixels([200, 30, 30, 255], [200, 30, 30, 255])),
    ).toMatch(/^hsl\(0 \d+% \d+%\)$/);
  });

  it('prefers vivid pixels over white background', () => {
    const data = pixels(
      ...Array(8).fill([255, 255, 255, 255]),
      [20, 60, 220, 255],
      [20, 60, 220, 255],
    );
    const hue = Number(/hsl\((\d+)/.exec(dominantFromPixels(data))?.[1]);
    expect(hue).toBeGreaterThan(200);
    expect(hue).toBeLessThan(240);
  });

  it('picks one color of a two-tone cover instead of mixing them', () => {
    const data = pixels(
      ...Array(6).fill([240, 160, 20, 255]),
      ...Array(4).fill([40, 110, 240, 255]),
    );
    const hue = Number(/hsl\((\d+)/.exec(dominantFromPixels(data))?.[1]);
    expect(hue).toBeGreaterThan(30);
    expect(hue).toBeLessThan(45);
  });

  it('falls back when every pixel is transparent', () => {
    expect(dominantFromPixels(pixels([0, 0, 0, 0]))).toBe('hsl(12 80% 55%)');
  });
});
