import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL)
console.log('KEY:', process.env.EXPO_PUBLIC_SUPABASE_KEY)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: Platform.OS !== 'web',
    detectSessionInUrl: Platform.OS === 'web',
  },
})