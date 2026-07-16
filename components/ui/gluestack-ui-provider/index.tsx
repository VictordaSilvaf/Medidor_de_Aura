import React, { useEffect } from 'react';
import { Appearance, View, type ColorSchemeName, type ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

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
  useEffect(() => {
    Appearance.setColorScheme(toNativeColorScheme(mode));
  }, [mode]);

  return (
    <View
      style={[
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
