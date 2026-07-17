import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, Sparkles, Zap } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  purchaseSubscriptionTier,
  restoreSubscriptions,
} from '@/src/features/monetization/monetizationBootstrap';
import {
  MonetizationNotConfiguredError,
} from '@/src/features/monetization/types';
import {
  PAID_TIERS,
  SUBSCRIPTION_TIER_COLORS,
  TIER_LIMITS,
  tierLabelKey,
  type SubscriptionTier,
} from '@/src/features/monetization/subscriptionTiers';
import {
  selectSubscriptionTier,
} from '@/src/features/social/profileSlice';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

const PAID: Array<Exclude<SubscriptionTier, 'free'>> = [
  'ascendente',
  'lendario',
  'divino',
];

function PlanCard({
  tier,
  current,
  loading,
  onSelect,
}: {
  tier: Exclude<SubscriptionTier, 'free'>;
  current: SubscriptionTier;
  loading: boolean;
  onSelect: (tier: Exclude<SubscriptionTier, 'free'>) => void;
}) {
  const { t } = useTranslation();
  const color = SUBSCRIPTION_TIER_COLORS[tier];
  const limits = TIER_LIMITS[tier];
  const isCurrent = current === tier;
  const isUpgrade =
    PAID_TIERS.indexOf(tier) > PAID_TIERS.indexOf(current);

  return (
    <GlowCard glowColor={color} glass className="px-5 py-5">
      <View style={styles.planHeader}>
        <View style={[styles.planIcon, { borderColor: `${color}66` }]}>
          <Crown size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planName, { color }]}>
            {t(tierLabelKey(tier))}
          </Text>
          <Text style={styles.planTagline}>{t(`premium.taglines.${tier}`)}</Text>
        </View>
        {isCurrent ? (
          <View style={[styles.currentBadge, { borderColor: `${color}55` }]}>
            <Text style={[styles.currentBadgeText, { color }]}>
              {t('premium.current')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.benefits}>
        <Text style={styles.benefit}>
          {t('premium.dailyQuota', { count: limits.daily })}
        </Text>
        <Text style={styles.benefit}>
          {t('premium.monthlyQuota', { count: limits.monthly })}
        </Text>
        <Text style={styles.benefit}>
          {t('premium.priority', { level: limits.priority })}
        </Text>
      </View>

      <GradientButton
        title={
          isCurrent
            ? t('premium.currentPlan')
            : isUpgrade
              ? t('premium.upgrade')
              : t('premium.subscribe')
        }
        variant={isCurrent ? 'ghost' : 'primary'}
        disabled={isCurrent || loading || Platform.OS === 'web'}
        onPress={() => onSelect(tier)}
        style={{ marginTop: 16 }}
      />
    </GlowCard>
  );
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const currentTier = useAppSelector(selectSubscriptionTier);
  const [loadingTier, setLoadingTier] = useState<
    Exclude<SubscriptionTier, 'free'> | null
  >(null);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = useCallback(
    async (tier: Exclude<SubscriptionTier, 'free'>) => {
      if (!user?.id) return;
      setLoadingTier(tier);
      try {
        await purchaseSubscriptionTier(dispatch, user.id, tier);
        Alert.alert(t('premium.successTitle'), t('premium.successBody'));
      } catch (error) {
        if (error instanceof MonetizationNotConfiguredError) {
          Alert.alert(t('premium.notConfiguredTitle'), t('premium.notConfiguredBody'));
        } else if (
          error &&
          typeof error === 'object' &&
          'userCancelled' in error &&
          (error as { userCancelled?: boolean }).userCancelled
        ) {
          // user dismissed store sheet
        } else {
          const message =
            error instanceof Error ? error.message : t('common.error');
          Alert.alert(t('common.error'), message);
        }
      } finally {
        setLoadingTier(null);
      }
    },
    [dispatch, t, user?.id],
  );

  const handleRestore = useCallback(async () => {
    if (!user?.id) return;
    setRestoring(true);
    try {
      const tier = await restoreSubscriptions(dispatch, user.id);
      Alert.alert(
        t('premium.restoreTitle'),
        tier === 'free'
          ? t('premium.restoreEmpty')
          : t('premium.restoreSuccess', { tier: t(tierLabelKey(tier)) }),
      );
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        Alert.alert(t('premium.notConfiguredTitle'), t('premium.notConfiguredBody'));
      } else {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('common.error'),
        );
      }
    } finally {
      setRestoring(false);
    }
  }, [dispatch, t, user?.id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>{t('premium.title')}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Sparkles size={28} color={palette.neon} />
          <Text style={styles.heroTitle}>{t('premium.heroTitle')}</Text>
          <Text style={styles.heroBody}>{t('premium.heroBody')}</Text>
          <View style={styles.currentRow}>
            <Zap size={14} color={SUBSCRIPTION_TIER_COLORS[currentTier]} />
            <Text style={styles.currentLine}>
              {t('premium.yourPlan', { tier: t(tierLabelKey(currentTier)) })}
            </Text>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <Text style={styles.webNote}>{t('premium.webNote')}</Text>
        ) : null}

        {PAID.map((tier) => (
          <PlanCard
            key={tier}
            tier={tier}
            current={currentTier}
            loading={loadingTier !== null}
            onSelect={handlePurchase}
          />
        ))}

        <GradientButton
          title={t('premium.restore')}
          variant="ghost"
          disabled={restoring || Platform.OS === 'web'}
          onPress={() => void handleRestore()}
        />

        {restoring ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 8 }} />
        ) : null}

        <Text style={styles.legal}>{t('premium.legal')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  screenTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  heroTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  heroBody: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currentLine: {
    color: palette.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  webNote: {
    color: palette.warning,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  planName: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  planTagline: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  currentBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  benefits: {
    marginTop: 14,
    gap: 6,
  },
  benefit: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  legal: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
