import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

// This handles the redirect back from the browser
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Login Failed', error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setLoading(false);
      // Route immediately to splash screen so splash screen does onboarding checks
      router.replace('/' as any);
    }
  };

  return (
    <LinearGradient
      colors={['#1E3A5F', '#2D5A8E', '#1A3055']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.replace('/onboarding/language-select' as any)}
            style={styles.langPrefButton}
            activeOpacity={0.85}
          >
            <Ionicons name="language-outline" size={16} color="#F4A833" style={{ marginRight: 6 }} />
            <Text style={styles.langPrefText}>{t('Language Preference')}</Text>
          </TouchableOpacity>
        </View>

        {/* Top Section - Logo & Branding */}
        <View style={styles.topSection}>
          <View style={styles.logo}>
            <Image source={require('../../assets/images/splash-icon.png')} style={styles.logoImage} />
          </View>
          <Text style={styles.appName}>GrowMark</Text>
          <Text style={styles.tagline}>{t('Track. Analyse. Grow.')}</Text>
        </View>

        {/* Form Section */}
        <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.heading}>{t('Welcome back')}</Text>
          <Text style={styles.subtitle}>{t('Sign in to continue')}</Text>

          {/* Email Field */}
          <Text style={styles.label}>{t('Email address')}</Text>
          <View style={[
            styles.fieldWrapper,
            focusedField === 'email' && styles.fieldWrapperFocused,
          ]}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
            <TextInput
              testID="login-email-input"
              style={styles.fieldInput}
              placeholder={t('Enter your email')}
              placeholderTextColor="#FFFFFF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password Field */}
          <Text style={styles.label}>{t('Password')}</Text>
          <View style={[
            styles.fieldWrapper,
            focusedField === 'password' && styles.fieldWrapperFocused,
          ]}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
            <TextInput
              testID="login-password-input"
              style={styles.fieldInput}
              placeholder={t('Enter your password')}
              placeholderTextColor="#FFFFFF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity 
            testID="login-password-toggle"
            onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            testID="login-submit-button"
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>{t('Login')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.orText}>{t('or continue with')}</Text>
            <View style={styles.divider} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                setGoogleLoading(true);
                let signInWithGoogleFn;
                try {
                  const module = require('../../lib/GoogleAuth');
                  signInWithGoogleFn = module.signInWithGoogle;
                } catch (e) {
                  // Catch dynamic loading error (e.g. native module issues)
                }

                if (!signInWithGoogleFn) {
                  Alert.alert(
                    'Google Sign-In Unavailable',
                    'Google Sign-In is a native module and is not supported in the standard Expo Go app. To use Google Sign-In, please run a native build (e.g., "npm run android") or sign in using Email/Password.'
                  );
                  return;
                }

                const res = await signInWithGoogleFn();
                if (res) {
                  router.replace('/' as any);
                }
              } catch (err: any) {
                // @react-native-google-signin/google-signin will handle some errors internally
                // If the user cancels the login, we shouldn't necessarily show an ugly error, but an alert is fine for now
                if (err.code !== 'SIGN_IN_CANCELLED') {
                  Alert.alert('Google Sign-In Error', err.message || 'An error occurred during sign in');
                }
              } finally {
                setGoogleLoading(false);
              }
            }}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1E3A5F" />
            ) : (
              <View style={styles.googleButtonInner}>
                <View style={styles.googleIconCircle}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>{t('Continue with Google')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t("Don't have an account?")} </Text>
            <Link href={"/auth/signup" as any} asChild>
              <TouchableOpacity testID="go-to-signup-button">
                <Text style={styles.signupLink}>{t('Sign up')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  langPrefButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langPrefText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  formSection: {
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontWeight: '500',
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  fieldWrapperFocused: {
    borderColor: '#F4A833',
    backgroundColor: 'rgba(244,168,51,0.08)',
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: '#FFFFFF',
  },
  loginButton: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  orText: {
    marginHorizontal: 14,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#1E3A5F',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#1E3A5F',
    fontSize: 15,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  signupText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  signupLink: {
    color: '#F4A833',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
