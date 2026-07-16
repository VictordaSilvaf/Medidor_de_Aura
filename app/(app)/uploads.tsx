import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, Film, Upload } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { selectSeenRevealIds } from '@/src/features/prefs/prefsSlice';
import {
  fetchMyAnalyses,
  type AnalysisListItem,
} from '@/src/features/video-analysis/analysisApi';
import {
  scoreColor,
  statusColor,
  statusLabel,
} from '@/src/features/video-analysis/statusUi';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openAnalysis(
  item: AnalysisListItem,
  seenIds: string[],
  router: ReturnType<typeof useRouter>,
) {
  if (item.status === 'completed' && item.result) {
    if (!seenIds.includes(item.id)) {
      router.push(`/(app)/reveal/${item.id}`);
      return;
    }
    router.push(`/(app)/result/${item.id}`);
    return;
  }
  if (item.status === 'failed') {
    router.push(`/(app)/processing/${item.id}`);
    return;
  }
  router.push(`/(app)/processing/${item.id}`);
}

export default function UploadsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const seenIds = useAppSelector(selectSeenRevealIds);

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-analyses', user?.id],
    queryFn: () => fetchMyAnalyses(user!.id, 40),
    enabled: Boolean(user?.id),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('uploads.title')}</Text>
          <Text style={styles.subtitle}>{t('uploads.subtitle')}</Text>
        </View>
        <Upload size={18} color={palette.neon} strokeWidth={2} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
            gap: 10,
            flexGrow: 1,
          }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Film size={28} color={palette.textDisabled} strokeWidth={1.6} />
              <Text style={styles.emptyText}>{t('uploads.empty')}</Text>
              <GradientButton
                title={t('hub.measureCta')}
                onPress={() => router.push('/(app)/capture')}
                style={{ alignSelf: 'stretch', marginTop: 12 }}
              />
            </View>
          }
          renderItem={({ item }) => {
            const tier = item.result
              ? TIER_BY_ID[item.result.tier_id]
              : null;
            const unseen =
              item.status === 'completed' && !seenIds.includes(item.id);
            return (
              <Pressable
                onPress={() => openAnalysis(item, seenIds, router)}
                style={[styles.row, unseen && styles.rowUnseen]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: statusColor(item.status) },
                  ]}
                />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowStatus}>
                      {statusLabel(item.status)}
                      {unseen ? ` · ${t('uploads.newBadge')}` : ''}
                    </Text>
                    <Text style={styles.rowWhen}>
                      {formatWhen(item.created_at)}
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.rowMeta}>
                      {item.source === 'camera'
                        ? t('preview.sourceCamera')
                        : t('preview.sourceGallery')}
                      {tier ? ` · ${tier.label}` : ''}
                    </Text>
                    {item.result ? (
                      <Text
                        style={[
                          styles.rowScore,
                          { color: scoreColor(item.result.score) },
                        ]}
                      >
                        +{item.result.score}
                      </Text>
                    ) : (
                      <Text style={styles.rowScoreMuted}>—</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  subtitle: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowUnseen: {
    borderColor: `${palette.primary}66`,
    backgroundColor: `${palette.primary}14`,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowStatus: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  rowWhen: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMeta: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  rowScore: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  rowScoreMuted: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
