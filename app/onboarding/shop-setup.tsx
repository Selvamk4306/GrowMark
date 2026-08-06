import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

const SHOP_TYPES = ['Grocery', 'Food and Beverage', 'Salon', 'Pharmacy', 'Clothing', 'Hardware', 'Other'];

export default function ShopSetupScreen() {
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    router.replace('/auth/login');
  };

  const handleNext = async () => {
    if (!shopName || !shopType) {
      Alert.alert('Error', 'Shop Name and Shop Type are required.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase.from('owners').insert([
        {
          user_id: session.user.id,
          shop_name: shopName,
          shop_type: shopType,
          location: location,
          username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        }
      ]);

      if (error) throw error;

      router.push('/onboarding/working-days' as any);
    } catch (error: any) {
      Alert.alert('Setup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar} />
      </View>
      <Text style={styles.progressText}>{t('Step 1 of 3')}</Text>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('Tell us about your shop.')}</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('Shop Name')}</Text>
          <TextInput
            testID="shop-name-input"
            style={styles.input}
            placeholder={t('Enter shop name')}
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('Shop Type')}</Text>
          <View style={styles.chipsContainer}>
            {SHOP_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                testID={`shop-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                style={[styles.chip, shopType === type && styles.chipSelected]}
                onPress={() => setShopType(type)}
              >
                <Text style={[styles.chipText, shopType === type && styles.chipTextSelected]}>
                  {t(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('Location (Optional)')}</Text>
          <TextInput
            testID="shop-location-input"
            style={styles.input}
            placeholder={t('City or Area')}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="shop-setup-back-button"
          style={styles.backButton}
          onPress={handleBack}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>{t('Back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="shop-setup-next-button"
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={styles.nextButtonText}>{t('Next')}</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.card} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    width: '33%',
    height: '100%',
    backgroundColor: Colors.accent,
  },
  progressText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: 'bold',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.card,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
