import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { LanguageProvider } from '../context/LanguageContext';
import { GlobalProvider } from '../context/GlobalContext';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.',
  'There was an error during concurrent rendering'
]);

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    // The AppState listener has been removed so splash screen doesn't show when returning from background.
  }, []);

  return (
    <GlobalProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="onboarding/shop-setup" />
          <Stack.Screen name="onboarding/item-setup" />
          <Stack.Screen name="dashboard" />
        </Stack>
      </LanguageProvider>
    </GlobalProvider>
  );
}