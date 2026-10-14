import { detectDeviceKind, localDeviceName } from './device-name';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  chromebook:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
};

describe('device name', () => {
  it('tells the kind of device from the user agent', () => {
    expect(detectDeviceKind(UA.iphone, 5)).toBe('iPhone');
    expect(detectDeviceKind(UA.ipad, 5)).toBe('iPad');
    expect(detectDeviceKind(UA.ipad, 0)).toBe('Mac');
    expect(detectDeviceKind(UA.android, 5)).toBe('Android');
    expect(detectDeviceKind(UA.windows, 0)).toBe('Windows');
    expect(detectDeviceKind(UA.chromebook, 0)).toBe('Chromebook');
    expect(detectDeviceKind('Something else', 0)).toBeNull();
  });

  it('prefers the name from the settings', () => {
    expect(localDeviceName('', 'iPhone')).toBe('Spoticast (iPhone)');
    expect(localDeviceName("  Ale's iPhone ", 'iPhone')).toBe(
      "Spoticast (Ale's iPhone)",
    );
    expect(localDeviceName('', null)).toBe('Spoticast');
  });
});
