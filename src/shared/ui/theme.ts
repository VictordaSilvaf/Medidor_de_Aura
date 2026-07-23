import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

/**
 * Tokens do design system "Farmar Aura" para estilos inline/Reanimated
 * (onde className não alcança: gradientes, glows, worklets).
 */
export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

const brand = {
  primary: '#6D5DFC',
  neon: '#00E5FF',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const darkPalette = {
  bg: '#09090B',
  bgSecondary: '#14141A',
  surface: '#1C1C24',
  card: '#16161F',
  textPrimary: '#FFFFFF',
  textSecondary: '#B4B4C7',
  textDisabled: '#6D6D80',
  ...brand,
  borderSubtle: 'rgba(255,255,255,0.08)',
  switchTrackOff: '#333333',
  segmentIdle: 'rgba(255,255,255,0.02)',
} as const;

export const lightPalette = {
  bg: '#FAFAFC',
  bgSecondary: '#F4F4F8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#111118',
  textSecondary: '#5B5B70',
  textDisabled: '#9A9AAD',
  ...brand,
  borderSubtle: 'rgba(17, 17, 24, 0.1)',
  switchTrackOff: '#D4D4DE',
  segmentIdle: 'rgba(17, 17, 24, 0.03)',
} as const;

/** Shared shape so light/dark palettes are interchangeable at the type level. */
export type AppPalette = { readonly [K in keyof typeof darkPalette]: string };

/**
 * Frozen dark tokens for non-reactive helpers (status colors, etc.).
 * For UI StyleSheets that must follow theme, use `usePalette()` /
 * `useThemedStyles()` instead.
 */
export const palette: AppPalette = darkPalette;

/** Resolved palette for the current Appearance / forced scheme. */
export function usePalette(): AppPalette {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightPalette : darkPalette;
}

/**
 * Build StyleSheet (or any style object) that updates when theme changes.
 * Pass a factory that only reads from the `p` argument.
 */
export function useThemedStyles<T>(factory: (p: AppPalette) => T): T {
  const p = usePalette();
  // factory is expected to be a stable module-level function
  return useMemo(() => factory(p), [p]);
}

/** Gradiente principal da marca. */
export const brandGradient = ['#6D5DFC', '#A855F7', '#EC4899'] as const;

/** Radius padrão de botões grandes e cards. */
export const radius = {
  button: 18,
  card: 20,
} as const;
