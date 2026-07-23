import React, { useEffect } from 'react';
import {
  Appearance,
  useColorScheme,
  View,
  type ColorSchemeName,
  type ViewProps,
} from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

import { darkPalette, lightPalette } from '@/src/shared/ui/theme';

export type ModeType = 'light' | 'dark' | 'system';

/**
 * Android rejects null in AppearanceModule.setColorScheme.
 * Use 'unspecified' to follow the device (MODE_NIGHT_FOLLOW_SYSTEM).
 */
function toNativeColorScheme(mode: ModeType): ColorSchemeName {
  if (mode === 'system') {
    return 'unspecified' as ColorSchemeName;
  }
  return mode;
}

export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const scheme = useColorScheme();
  const bg = scheme === 'light' ? lightPalette.bg : darkPalette.bg;

  useEffect(() => {
    Appearance.setColorScheme(toNativeColorScheme(mode));
  }, [mode]);

  // NativeWind CSS vars: class must win over prefers-color-scheme when the
  // user forces light/dark (OS media query alone is not enough on web).
  const themeClass = scheme === 'light' ? 'light' : 'dark';

  return (
    <View
      className={themeClass}
      style={[
        { flex: 1, height: '100%', width: '100%', backgroundColor: bg },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
