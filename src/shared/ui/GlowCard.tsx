import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Box } from '@/components/ui/box';
import { palette, radius } from '@/src/shared/ui/theme';

type GlowCardProps = {
  children: ReactNode;
  /** Cor do glow externo — padrão roxo da marca. */
  glowColor?: string;
  /** Glassmorphism leve (expo-blur) — usar só em componentes importantes. */
  glass?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Card padrão do design system: surface escura, borda branca 8%, glow suave. */
export function GlowCard({
  children,
  glowColor = palette.primary,
  glass = false,
  className,
  style,
}: GlowCardProps) {
  return (
    <Box
      className={`rounded-[20px] border border-border ${
        glass ? 'overflow-hidden bg-card/80' : 'bg-card'
      } ${className ?? ''}`}
      style={[
        {
          borderCurve: 'continuous',
          borderRadius: radius.card,
          boxShadow: `0 10px 42px -12px ${glowColor}4D`,
        },
        style,
      ]}
    >
      {glass ? (
        <BlurView
          pointerEvents="none"
          intensity={35}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </Box>
  );
}
