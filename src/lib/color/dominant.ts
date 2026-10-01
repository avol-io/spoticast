import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h * 60, s, l];
}

const HUE_BUCKETS = 12;

/**
 * Picks the most represented hue (weighted towards saturated pixels) and
 * averages the pixels of that hue, so two-tone covers yield one of their
 * colors instead of a muddy mix. The result is clamped to a lightness that
 * works as a background tint and as an accent on both themes.
 */
export function dominantFromPixels(data: Uint8ClampedArray): string {
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({
    r: 0,
    g: 0,
    b: 0,
    weight: 0,
  }));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    // Near-white/near-black and grey pixels barely count.
    const weight = (l > 0.92 || l < 0.08 ? 0.05 : 1) * (0.1 + s);
    const bucket = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
    bucket.r += data[i] * weight;
    bucket.g += data[i + 1] * weight;
    bucket.b += data[i + 2] * weight;
    bucket.weight += weight;
  }
  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (best.weight === 0) return 'hsl(12 80% 55%)';
  const [h, s, l] = rgbToHsl(
    best.r / best.weight,
    best.g / best.weight,
    best.b / best.weight,
  );
  const sat = Math.min(0.85, Math.max(0.35, s));
  const light = Math.min(0.6, Math.max(0.42, l));
  return `hsl(${Math.round(h)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%)`;
}

export async function dominantColor(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 24;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(img, 0, 0, 24, 24);
  const color = dominantFromPixels(ctx.getImageData(0, 0, 24, 24).data);
  cache.set(url, color);
  return color;
}

/** Dominant color of a cover, or undefined until computed (or on failure). */
export function useDominantColor(url: string | undefined): string | undefined {
  const [color, setColor] = useState(() => (url ? cache.get(url) : undefined));
  useEffect(() => {
    if (!url) return;
    let active = true;
    dominantColor(url).then(
      (c) => active && setColor(c),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [url]);
  return color;
}
