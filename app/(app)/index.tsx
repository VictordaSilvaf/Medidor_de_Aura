import { useRouter } from 'expo-router';
import { LogOut, Zap } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuraStats } from '@/src/features/aura/auraSlice';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { signOut } from '@/src/features/auth/authService';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { ThemeToggle } from '@/src/shared/ui/ThemeToggle';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

function StatBlock({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <VStack className="flex-1 items-center" space="xs">
      <Text
        className="text-2xl text-foreground"
        style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text
        className="text-xs uppercase text-muted-foreground"
        style={[{ fontFamily: fonts.medium, letterSpacing: 1.5 }, valueColor ? { color: valueColor } : null]}
      >
        {label}
      </Text>
    </VStack>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const stats = useAppSelector(selectAuraStats);

  const bestTier = stats.bestTierId ? TIER_BY_ID[stats.bestTierId] : null;
  const orbColors = bestTier?.gradient ?? brandGradient;
  const orbGlow = bestTier?.color ?? palette.primary;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível sair';
      Alert.alert('Erro', message);
    }
  };

  return (
    <Box className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 24,
          flexGrow: 1,
          gap: 28,
        }}
      >
        <HStack className="items-center justify-between">
          <VStack space="xs">
            <Text
              className="text-xs uppercase text-muted-foreground"
              style={{ fontFamily: fonts.semibold, letterSpacing: 3 }}
            >
              Medidor de Aura
            </Text>
            <Text className="text-sm text-muted-foreground">
              {user?.email ?? 'Perfil anônimo'}
            </Text>
          </VStack>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            onPress={handleSignOut}
            hitSlop={10}
            style={styles.iconButton}
          >
            <LogOut size={18} color={palette.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </HStack>

        <GlowCard glowColor={orbGlow}>
          <HStack className="items-center px-4 py-5">
            <StatBlock label="Aura total" value={String(stats.totalAura)} />
            <View style={styles.divider} />
            <StatBlock label="Medições" value={String(stats.measurements)} />
            <View style={styles.divider} />
            <StatBlock
              label={bestTier ? bestTier.label : 'Melhor tier'}
              value={bestTier ? '★' : '—'}
              valueColor={bestTier?.color}
            />
          </HStack>
        </GlowCard>

        <View style={styles.orbArea}>
          <AuraOrb
            size={224}
            colors={orbColors}
            glowColor={orbGlow}
            intensity={0.18}
          />
          <Text className="text-center text-sm text-muted-foreground px-8">
            {stats.measurements === 0
              ? 'Seu campo de energia ainda não foi lido. Faça a primeira medição.'
              : 'O campo está estável. Uma nova leitura pode render mais aura.'}
          </Text>
        </View>

        <VStack space="lg">
          <GradientButton
            title="Medir aura"
            icon={<Zap size={20} color="#FFFFFF" strokeWidth={2.2} />}
            onPress={() => router.push('/(app)/capture')}
            accessibilityLabel="Medir sua aura agora"
          />

          <VStack space="sm">
            <Text
              className="text-xs uppercase text-muted-foreground"
              style={{ fontFamily: fonts.medium, letterSpacing: 2 }}
            >
              Aparência
            </Text>
            <ThemeToggle />
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbArea: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
  },
});
