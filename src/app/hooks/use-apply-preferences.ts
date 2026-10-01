import { useEffect } from 'react';
import i18n, { browserLanguage } from '../../i18n';
import { useSettings, type ThemePreference } from '../../lib/storage/settings';

function resolveTheme(pref: ThemePreference, prefersDark: boolean) {
  if (pref === 'auto') return prefersDark ? 'dark' : 'light';
  return pref;
}

/** Mirrors theme and language settings onto <html> and i18next. */
export function useApplyPreferences() {
  const theme = useSettings((s) => s.theme);
  const language = useSettings((s) => s.language);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = resolveTheme(theme, media.matches);
      document.documentElement.dataset.theme = resolved;
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg')
        .trim();
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          'content',
          bg || (resolved === 'dark' ? '#0f1115' : '#f6f7f9'),
        );
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const lng = language === 'auto' ? browserLanguage() : language;
    void i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  }, [language]);
}
