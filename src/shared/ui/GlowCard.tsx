import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Box } from '@/components/ui/box';
import { radius, usePalette } from '@/src/shared/ui/theme';

type GlowCardProps = {
  children: ReactNode;
  /** Cor do glow externo — padrão roxo da marca. */
  glowColor?: string;
  /** Glassmorphism leve (expo-blur) — usar só em componentes importantes. */
  glass?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Card padrão do design system: surface, borda sutil, glow suave. */
export function GlowCard({
  children,
  glowColor,
  glass = false,
  className,
  style,
}: GlowCardProps) {
  const palette = usePalette();
  const scheme = useColorScheme();
  const glow = glowColor ?? palette.primary;

  return (
    <Box
      className={`rounded-[20px] border border-border ${
        glass ? 'overflow-hidden bg-card/80' : 'bg-card'
      } ${className ?? ''}`}
      style={[
        {
          borderCurve: 'continuous',
          borderRadius: radius.card,
          boxShadow: `0 10px 42px -12px ${glow}4D`,
        },
        style,
      ]}
    >
      {glass ? (
        <BlurView
          pointerEvents="none"
          intensity={scheme === 'light' ? 40 : 35}
          tint={scheme === 'light' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </Box>
  );
}
