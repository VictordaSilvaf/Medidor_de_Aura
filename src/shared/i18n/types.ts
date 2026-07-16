export type AppLocale = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LOCALES: AppLocale[] = ['pt-BR', 'en', 'es'];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
};
