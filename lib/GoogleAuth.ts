import { Alert } from 'react-native';
import { supabase } from './supabase';

let GoogleSignin: any = null;
try {
  // Dynamically require to avoid crash on Expo Go where native module RNGoogleSignin is not present
  const module = require('@react-native-google-signin/google-signin');
  GoogleSignin = module.GoogleSignin;
} catch (e) {
  console.warn('GoogleSignin native module not found. Google Sign-In will not be available in Expo Go.');
}

export const signInWithGoogle = async () => {
  if (!GoogleSignin) {
    Alert.alert(
      'Google Sign-In Unavailable',
      'Google Sign-In is a native module and is not supported in the standard Expo Go app. To use Google Sign-In, please run a native build (e.g., "npm run android") or build a development client.'
    );
    return null;
  }

  try {
    GoogleSignin.configure({
      webClientId: '734565557552-hsqqg9uppjf3tpucn0f91jr62rbl9uet.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    });

    await GoogleSignin.hasPlayServices();

    await GoogleSignin.signOut();
    const userInfo = await GoogleSignin.signIn();
    
    // Handle different versions of google-signin package
    const idToken = userInfo?.data?.idToken || (userInfo as any)?.idToken;

    if (!idToken) {
      throw new Error('No ID token present!');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};