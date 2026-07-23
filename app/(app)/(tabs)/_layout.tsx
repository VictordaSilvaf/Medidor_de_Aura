import { Redirect, Tabs } from 'expo-router';
import {
  Home,
  Newspaper,
  Search,
  Swords,
  UserRound,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAppSelector } from '@/src/core/hooks';
import {
  selectProfileLoading,
  selectSetupRequired,
} from '@/src/features/social/profileSlice';
import { usePalette } from '@/src/shared/ui/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const setupRequired = useAppSelector(selectSetupRequired);
  const profileLoading = useAppSelector(selectProfileLoading);
  const palette = usePalette();

  if (!profileLoading && setupRequired) {
    return <Redirect href="/(app)/profile/setup" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.bgSecondary,
          borderTopColor: palette.borderSubtle,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textDisabled,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'SpaceGrotesk_500Medium',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.hub'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: t('tabs.challenges'),
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color }) => (
            <View
              style={{
                width: 48,
                height: 48,
                marginTop: -16,
                borderRadius: 24,
                backgroundColor: palette.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: `${palette.primary}99`,
              }}
            >
              <Newspaper color="#FFF" size={22} strokeWidth={2.2} />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarActiveTintColor: palette.primary,
        }}
      />
      <Tabs.Screen
        name="measure"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => (
            <Search color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
