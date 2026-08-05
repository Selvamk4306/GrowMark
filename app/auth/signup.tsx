import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Animated, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup Failed', error.message);
      return;
    }

    if (data.session) {
      router.replace('/' as any);
    } else {
      Alert.alert('Success', 'Please check your email for verification.');
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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        {/* Top Section - Logo & Branding */}
        <View style={styles.topSection}>
          <View style={styles.logo}>
            <Image source={require('../../assets/images/splash-icon.png')} style={styles.logoImage} />
          </View>
          <Text style={styles.appName}>GrowMark</Text>
          <Text style={styles.tagline}>{t('Join thousands of shop owners')}</Text>
        </View>

        {/* Form Section */}
        <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.heading}>{t('Create account')}</Text>
          <Text style={styles.subtitle}>{t('Start your free journey today')}</Text>

          {/* Full Name Field */}
          <Text style={styles.label}>{t('Full Name')}</Text>
          <View style={[
            styles.fieldWrapper,
            focusedField === 'name' && styles.fieldWrapperFocused,
          ]}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.fieldInput}
              placeholder={t('Enter your full name')}
              placeholderTextColor="#FFFFFF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Email Field */}
          <Text style={styles.label}>{t('Email address')}</Text>
          <View style={[
            styles.fieldWrapper,
            focusedField === 'email' && styles.fieldWrapperFocused,
          ]}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
            <TextInput
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
              style={styles.fieldInput}
              placeholder={t('Create a password')}
              placeholderTextColor="#FFFFFF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Field */}
          <Text style={styles.label}>{t('Confirm Password')}</Text>
          <View style={[
            styles.fieldWrapper,
            focusedField === 'confirmPassword' && styles.fieldWrapperFocused,
          ]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.fieldInput}
              placeholder={t('Confirm your password')}
              placeholderTextColor="#FFFFFF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>{t('Create Account')}</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('Already have an account?')} </Text>
            <Link href={"/auth/login" as any} asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>{t('Login')}</Text>
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
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
    marginBottom: 24,
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
    marginBottom: 16,
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
  signupButton: {
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
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  loginText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  loginLink: {
    color: '#F4A833',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
