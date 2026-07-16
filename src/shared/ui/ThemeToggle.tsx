import { Pressable } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import {
  selectThemeMode,
  setThemeMode,
  type ThemeMode,
} from '@/src/features/prefs/prefsSlice';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);

  return (
    <Box className={className}>
      <HStack className="rounded-lg border border-border bg-muted p-1" space="xs">
        {OPTIONS.map((option) => {
          const selected = themeMode === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Tema ${option.label}`}
              onPress={() => dispatch(setThemeMode(option.value))}
              className={`flex-1 items-center rounded-md px-3 py-2 ${
                selected ? 'bg-background' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    </Box>
  );
}
