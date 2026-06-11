import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  const handleContinue = async () => {
    if (!language) return;
    try {
      await AsyncStorage.setItem('has_selected_language', 'true');
      router.replace('/auth/login' as any);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  const selectedLang = LANGUAGES.find(l => l.label === language);

  return (
    <LinearGradient
      colors={['#1E3A5F', '#2D5A8E', '#1A3055']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topSection}>
        <View style={styles.logo}>
          <Image source={require('../../assets/images/splash-icon.png')} style={styles.logoImage} />
        </View>
        <Text style={styles.appName}>GrowMark</Text>
        <Text style={styles.tagline}>{t('Track your sales. Grow your business.') || 'Track your sales. Grow your business.'}</Text>
      </View>

      <View style={styles.headingSection}>
        <Text style={styles.heading}>{t('Choose your language') || 'Choose your language'}</Text>
        <Text style={styles.subtitle}>{t('You can change this anytime in settings') || 'You can change this anytime in settings'}</Text>
      </View>

      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map((lang, index) => (
          <LanguageCard 
            key={lang.code} 
            lang={lang} 
            index={index} 
            selected={language === lang.label} 
            onPress={() => setLanguage(lang.label)} 
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {selectedLang && (
          <Text style={styles.selectedText}>{selectedLang.native} selected</Text>
        )}
        <TouchableOpacity 
          style={[styles.button, !language && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={!language}
        >
          <Text style={styles.buttonText}>{t('Continue')}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function LanguageCard({ lang, index, selected, onPress }: any) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: selected ? 1.02 : 1,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim }}>
      <TouchableOpacity 
        style={[styles.card, selected && styles.cardSelected]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={[styles.nativeName, selected && styles.nativeNameSelected]}>{lang.native}</Text>
          <Text style={styles.englishName}>{lang.label}</Text>
        </View>
        <View style={[styles.circle, selected && styles.circleSelected]}>
          {selected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 18,
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
    width: 70,
    height: 70,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  headingSection: {
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 40,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listContentContainer: {
    paddingBottom: 180,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: '#F4A833',
    backgroundColor: 'rgba(244,168,51,0.15)',
  },
  cardLeft: {
    flexDirection: 'column',
  },
  nativeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  nativeNameSelected: {
    color: 'white',
  },
  englishName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: {
    borderColor: '#F4A833',
    backgroundColor: '#F4A833',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  selectedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#F4A833',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
