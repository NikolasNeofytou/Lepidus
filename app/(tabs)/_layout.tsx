import React from 'react';
import { Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type TabIconName = 'home' | 'map' | 'tag' | 'user';

const TAB_CONFIG: { name: string; title: string; icon: TabIconName }[] = [
  { name: 'index', title: 'Discover', icon: 'home' },
  { name: 'map',   title: 'Map',      icon: 'map'  },
  { name: 'deals', title: 'Deals',    icon: 'tag'  },
  { name: 'profile', title: 'Profile', icon: 'user' },
];

// Screens that exist as files but are not shown in the tab bar
const HIDDEN_SCREENS = ['list', 'trends', 'settings'];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: colors.text,
          letterSpacing: -0.4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: 16,
          right: 16,
          height: 64,
          backgroundColor: colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
          shadowRadius: 24,
          elevation: 10,
          paddingBottom: 0,
          paddingHorizontal: 8,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: -2,
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
      }}
    >
      {/* Hidden screens – keep accessible via router.push but not in tab bar */}
      {HIDDEN_SCREENS.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}

      {/* Main tabs */}
      {TAB_CONFIG.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // Map and Discover manage their own headers
            headerShown: name !== 'map' && name !== 'index',
            tabBarIcon: ({ color, focused }) => (
              <FontAwesome
                name={icon}
                size={focused ? 21 : 19}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
