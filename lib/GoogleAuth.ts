import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

export const signInWithGoogle = async () => {
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