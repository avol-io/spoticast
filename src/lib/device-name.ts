import { APP_TITLE } from './build-info';

/** Longest name the user can give this device. */
export const MAX_DEVICE_NAME = 40;

/**
 * Kind of device, from the user agent: browsers don't expose the name the
 * user gave it ("Ale's iPhone").
 */
export function detectDeviceKind(
  userAgent = navigator.userAgent,
  touchPoints = navigator.maxTouchPoints,
): string | null {
  if (/iphone|ipod/i.test(userAgent)) return 'iPhone';
  // iPadOS asks for desktop sites as a Mac with a touch screen.
  if (
    /ipad/i.test(userAgent) ||
    (/macintosh/i.test(userAgent) && touchPoints > 1)
  )
    return 'iPad';
  if (/android/i.test(userAgent)) return 'Android';
  if (/cros/i.test(userAgent)) return 'Chromebook';
  if (/macintosh|mac os x/i.test(userAgent)) return 'Mac';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/linux/i.test(userAgent)) return 'Linux';
  return null;
}

/**
 * Name Spotify Connect shows for this browser, e.g. "Spoticast Beta (Ale's
 * iPhone)": the name from the settings, else the kind of device.
 */
export function localDeviceName(
  custom: string,
  kind: string | null = detectDeviceKind(),
): string {
  const label = custom.trim().slice(0, MAX_DEVICE_NAME) || kind;
  return label ? `${APP_TITLE} (${label})` : APP_TITLE;
}
