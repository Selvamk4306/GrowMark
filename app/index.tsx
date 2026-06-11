import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../hooks/useTranslation';

export default function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const loadingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadingProgress.setValue(0);

    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const checkSessionAndNavigate = async () => {
      // Wait for 2.5 seconds to show splash
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const hasSelectedLang = await AsyncStorage.getItem('has_selected_language');
        if (!hasSelectedLang) {
          router.replace('/onboarding/language-select' as any);
          return;
        }

        const lastActiveStr = await AsyncStorage.getItem('last_active_timestamp');
        const now = Date.now();
        const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (now - lastActive > tenDaysMs) {
            // Log out user due to inactivity
            await supabase.auth.signOut();
          }
        }

        // Update last active
        await AsyncStorage.setItem('last_active_timestamp', now.toString());

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/auth/login' as any);
          return;
        }

        // Check if user has completed onboarding by checking owners table
        const { data: owner, error } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (owner && !error) {
          router.replace('/dashboard' as any);
        } else {
          router.replace('/onboarding/shop-setup' as any);
        }
      } catch (error) {
        console.error('Splash Screen Auth Check Error:', error);
        router.replace('/auth/login' as any);
      }
    };

    checkSessionAndNavigate();
  }, []);

  const progressWidth = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/splash-icon.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.appName}>GrowMark</Text>
        <Text style={styles.tagline}>{t('Monitor. Decide. Grow.')}</Text>
      </View>
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingBar, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.highlight,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.highlight,
  },
  loadingContainer: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 50,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: Colors.highlight,
  },
});
