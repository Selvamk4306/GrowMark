import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { LanguageProvider } from '../context/LanguageContext';
import { GlobalProvider } from '../context/GlobalContext';
import { LogBox } from 'react-native';
import React from 'react';

// Silence concurrent rendering recovery warnings in Metro / LogBox / Console
const filterConcurrentWarning = (...args: any[]) => {
  const msg = args
    .map(a => {
      if (a instanceof Error) {
        return a.message + ' ' + (a.stack || '');
      }
      if (a && typeof a === 'object') {
        if (a.message) return String(a.message) + ' ' + String(a.stack || '');
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');

  return (
    msg.includes('concurrent rendering') ||
    msg.includes('synchronously rendering') ||
    msg.includes('recover by instead synchronously')
  );
};

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (filterConcurrentWarning(...args)) return;
  origWarn(...args);
};

const origError = console.error;
console.error = (...args: any[]) => {
  if (filterConcurrentWarning(...args)) return;
  origError(...args);
};

if ((global as any).ErrorUtils) {
  const origHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    if (filterConcurrentWarning(error)) return;
    if (origHandler) origHandler(error, isFatal);
  });
}

LogBox.ignoreLogs([
  'There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.',
  'There was an error during concurrent rendering',
  '"shadow*" style props are deprecated',
  'Image: style.resizeMode is deprecated',
  'Animated: `useNativeDriver` is not supported',
  'props.pointerEvents is deprecated'
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