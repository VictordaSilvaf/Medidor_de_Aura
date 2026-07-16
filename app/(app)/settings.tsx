import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import {
  selectDefaultVisibility,
  selectLocale,
  selectPushEnabled,
  selectThemeMode,
  setDefaultVisibility,
  setLocale,
  setPushEnabled,
  setThemeMode,
  type DefaultVisibility,
  type ThemeMode,
} from '@/src/features/prefs/prefsSlice';
import { updateProfile } from '@/src/features/social/profileApi';
import {
  patchMyProfile,
  selectMyProfile,
} from '@/src/features/social/profileSlice';
import {
  LOCALE_LABELS,
  type AppLocale,
} from '@/src/shared/i18n/types';
import { fonts, palette } from '@/src/shared/ui/theme';

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const locale = useAppSelector(selectLocale);
  const visibility = useAppSelector(selectDefaultVisibility);
  const pushEnabled = useAppSelector(selectPushEnabled);
  const profile = useAppSelector(selectMyProfile);

  const currentLocale = (locale ?? i18n.language) as AppLocale;

  const syncVisibility = async (next: DefaultVisibility) => {
    dispatch(setDefaultVisibility(next));
    if (profile) {
      try {
        const updated = await updateProfile(profile.user_id, {
          default_visibility: next,
        });
        dispatch(patchMyProfile(updated));
      } catch {
        // local prefs still apply
      }
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 32,
          gap: 22,
        }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <Segmented<ThemeMode>
            value={themeMode}
            onChange={(v) => dispatch(setThemeMode(v))}
            options={[
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <Segmented<AppLocale>
            value={currentLocale}
            onChange={(v) => {
              dispatch(setLocale(v));
              void i18n.changeLanguage(v);
            }}
            options={(Object.keys(LOCALE_LABELS) as AppLocale[]).map((code) => ({
              value: code,
              label: LOCALE_LABELS[code],
            }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.privacy')}</Text>
          <Text style={styles.hint}>{t('settings.visibilityHint')}</Text>
          <Segmented<DefaultVisibility>
            value={visibility}
            onChange={(v) => void syncVisibility(v)}
            options={[
              { value: 'private', label: t('settings.visibilityPrivate') },
              { value: 'public', label: t('settings.visibilityPublic') },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.pushEnabled')}</Text>
            <Switch
              value={pushEnabled}
              onValueChange={(v) => {
                dispatch(setPushEnabled(v));
              }}
              trackColor={{ true: palette.primary, false: '#333' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <Text style={styles.hint}>
            {t('settings.version', {
              version: Constants.expoConfig?.version ?? '1.0.0',
            })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  section: { gap: 10 },
  sectionTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  segmentItemActive: {
    backgroundColor: `${palette.primary}33`,
  },
  segmentLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  segmentLabelActive: {
    color: palette.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
