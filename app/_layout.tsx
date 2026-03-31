import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { useFavoritesStore } from '@/stores/favorites';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/services/supabase';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (isLoading) return; // still bootstrapping — don't redirect yet

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in but still on auth screen → go to app
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

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
