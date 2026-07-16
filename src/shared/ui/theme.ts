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

export const palette = {
  bg: '#09090B',
  bgSecondary: '#14141A',
  surface: '#1C1C24',
  card: '#16161F',
  textPrimary: '#FFFFFF',
  textSecondary: '#B4B4C7',
  textDisabled: '#6D6D80',
  primary: '#6D5DFC',
  neon: '#00E5FF',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  borderSubtle: 'rgba(255,255,255,0.08)',
} as const;

/** Gradiente principal da marca. */
export const brandGradient = ['#6D5DFC', '#A855F7', '#EC4899'] as const;

/** Radius padrão de botões grandes e cards. */
export const radius = {
  button: 18,
  card: 20,
} as const;
