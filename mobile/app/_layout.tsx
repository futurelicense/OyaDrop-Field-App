import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import 'react-native-reanimated';

import { MobileWebShell } from '@/components/MobileWebShell';
import { useColorScheme } from '@/components/useColorScheme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // On web, custom fonts can block first paint indefinitely; don't white-screen the app.
  const fontsReady = Platform.OS === 'web' || loaded;
  if (!fontsReady) {
    return null;
  }

  if (!clerkKey.trim()) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Text style={{ textAlign: 'center', fontSize: 16 }}>
          Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in mobile/.env (same Clerk app as
          the web provider console). Restart Expo after adding it.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey.trim()}
      tokenCache={tokenCache ?? undefined}
    >
      <RootLayoutNav />
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MobileWebShell>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="order/[id]"
            options={{ title: 'Request', headerBackTitle: 'Back' }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </MobileWebShell>
    </ThemeProvider>
  );
}
