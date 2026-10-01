import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, type Dictionary } from './en';
import { it } from './it';

export const supportedLanguages = ['it', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Dictionary };
  }
}

export function browserLanguage(): Language {
  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of preferred) {
    const base = tag.slice(0, 2).toLowerCase();
    if ((supportedLanguages as readonly string[]).includes(base)) {
      return base as Language;
    }
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, it: { translation: it } },
  lng: browserLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
