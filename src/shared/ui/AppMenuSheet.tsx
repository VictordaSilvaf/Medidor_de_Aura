import { useRouter } from 'expo-router';
import {
  Bell,
  Crown,
  Film,
  LogOut,
  Menu,
  Search,
  Settings,
  Swords,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { signOut } from '@/src/features/auth/authService';
import {
  selectMyProfile,
  setMyProfile,
} from '@/src/features/social/profileSlice';
import { fonts, palette } from '@/src/shared/ui/theme';

import { UserAvatar } from './UserAvatar';

type MenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  danger?: boolean;
};

export function AppMenuButton({
  accessibilityLabel,
}: {
  accessibilityLabel?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t('menu.open')}
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={styles.trigger}
      >
        <Menu size={20} color={palette.textPrimary} strokeWidth={2.2} />
      </Pressable>
      <AppMenuSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AppMenuSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectMyProfile);

  const go = (href: string) => {
    onClose();
    // Defer navigation so the modal unmounts cleanly.
    requestAnimationFrame(() => {
      router.push(href as never);
    });
  };

  const items: MenuItem[] = [
    {
      key: 'profile',
      label: t('menu.profile'),
      icon: <User size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/(tabs)/profile'),
    },
    {
      key: 'search',
      label: t('menu.search'),
      icon: <Search size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/(tabs)/search'),
    },
    {
      key: 'notifications',
      label: t('menu.notifications'),
      icon: <Bell size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/notifications'),
    },
    {
      key: 'feed',
      label: t('menu.feed'),
      icon: <Users size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/(tabs)/feed'),
    },
    {
      key: 'challenges',
      label: t('menu.challenges'),
      icon: <Swords size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/(tabs)/challenges'),
    },
    {
      key: 'premium',
      label: t('menu.premium'),
      icon: <Crown size={20} color={palette.neon} />,
      onPress: () => go('/(app)/premium'),
    },
    {
      key: 'uploads',
      label: t('menu.uploads'),
      icon: <Film size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/uploads'),
    },
    {
      key: 'settings',
      label: t('menu.settings'),
      icon: <Settings size={20} color={palette.textPrimary} />,
      onPress: () => go('/(app)/settings'),
    },
    {
      key: 'signOut',
      label: t('common.signOut'),
      icon: <LogOut size={20} color={palette.error} />,
      danger: true,
      onPress: () => {
        onClose();
        void (async () => {
          await signOut();
          dispatch(setMyProfile(null));
        })();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.identity}>
              <UserAvatar
                uri={profile?.avatar_url}
                name={profile?.display_name}
                size={44}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile?.display_name ?? t('hub.anonymous')}
                </Text>
                {profile?.username ? (
                  <Text style={styles.username}>@{profile.username}</Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel={t('menu.close')}
              style={styles.closeBtn}
            >
              <X size={20} color={palette.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.items}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                {item.icon}
                <Text
                  style={[styles.itemLabel, item.danger && styles.itemDanger]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
  },
  sheet: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: palette.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: palette.borderSubtle,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  displayName: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: { gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  itemPressed: { backgroundColor: palette.surface },
  itemLabel: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  itemDanger: { color: palette.error },
});
