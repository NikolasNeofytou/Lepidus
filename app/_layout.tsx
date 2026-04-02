import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/components/useColorScheme';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useFavoritesStore } from '@/stores/favorites';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';
import { registerForPushNotifications, savePushToken } from '@/services/notifications';
import { initSentry } from '@/services/sentry';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
initSentry();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync();
    loadFavorites();

    // Bootstrap session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (isLoading) return; // still bootstrapping — don't redirect yet

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in but still on auth screen → go to app
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  // Register push notifications when user signs in
  useEffect(() => {
    if (!session || Platform.OS === 'web') return;

    registerForPushNotifications().then((token) => {
      if (token) savePushToken(token);
    });

    // Handle notification taps → navigate to station
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.stationId) {
        router.push(`/station/${data.stationId}`);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [session]);

  // Show a spinner while the session is being loaded from storage
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16a34a' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <QueryProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
          <Stack.Screen name="(auth)"   options={{ headerShown: false }} />
          <Stack.Screen
            name="station/[id]"
            options={{ title: 'Station Details', presentation: 'modal' }}
          />
        </Stack>
      </ThemeProvider>
    </QueryProvider>
  );
}
