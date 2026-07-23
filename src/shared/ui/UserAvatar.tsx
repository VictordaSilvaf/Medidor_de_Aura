import { useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Text } from "@/components/ui/text";
import { fonts, usePalette } from "@/src/shared/ui/theme";

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
};

export function UserAvatar({
  uri,
  name,
  size = 44,
  style,
  accentColor,
}: Props) {
  const letter = (name?.trim()?.[0] ?? "?").toUpperCase();
  const radius = size / 2;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const palette = usePalette();
  const accent = accentColor ?? palette.primary;

  if (uri && failedUri !== uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: palette.surface,
          },
          style as object,
        ]}
        accessibilityIgnoresInvertColors
        onError={() => setFailedUri(uri)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: `${accent}33`,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.letter,
          { color: accent, fontSize: Math.max(12, size * 0.38) },
        ]}
      >
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontFamily: fonts.bold,
  },
});
