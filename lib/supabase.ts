import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// Use localStorage on web so sessions survive page refreshes and navigation.
// Guard with typeof check: during SSR (Expo Router pre-renders in Node.js),
// localStorage does not exist — return null safely, it will re-hydrate in browser.
const isLocalStorageAvailable = typeof localStorage !== 'undefined';

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(isLocalStorageAvailable ? localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => { if (isLocalStorageAvailable) localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { if (isLocalStorageAvailable) localStorage.removeItem(key); return Promise.resolve(); },
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
// Trigger Metro rebuild
