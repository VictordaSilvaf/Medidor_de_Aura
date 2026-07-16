import * as Localization from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import { SUPPORTED_LOCALES, type AppLocale } from './types';

function detectDeviceLocale(): AppLocale {
  const tag = Localization.getLocales()[0]?.languageTag ?? 'pt-BR';
  if (tag.startsWith('pt')) return 'pt-BR';
  if (tag.startsWith('es')) return 'es';
  if (tag.startsWith('en')) return 'en';
  return 'pt-BR';
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectDeviceLocale(),
  fallbackLng: 'pt-BR',
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
});

export { detectDeviceLocale };
export default i18n;
