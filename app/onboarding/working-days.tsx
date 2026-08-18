import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkingDaysScreen() {
  // Pre-select Mon to Sat by default
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [openingTime, setOpeningTime] = useState('09:00 AM');
  const [closingTime, setClosingTime] = useState('09:00 PM');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleBack = () => {
    router.replace('/onboarding/shop-setup');
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      // Keep order
      const newDays = [...selectedDays, day];
      newDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
      setSelectedDays(newDays);
    }
  };

  const setMonToSat = () => {
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  };

  const setMonToSun = () => {
    setSelectedDays([...DAYS]);
  };

  const handleNext = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one working day.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data: owner } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!owner) throw new Error('Owner profile not found');

      const { error } = await supabase
        .from('owners')
        .update({ 
          working_days: selectedDays
        })
        .eq('id', owner.id);

      if (error) throw error;
      
      router.push('/onboarding/item-setup' as any);
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
      <Text style={styles.progressText}>{t('Step 2 of 3')}</Text>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('When does your store operate?')}</Text>
        <Text style={styles.subtitle}>{t('This helps us track only your working days')}</Text>

        <View style={styles.daysContainer}>
          {DAYS.map((day) => {
            const isSelected = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {t(day)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.presetsContainer}>
          <TouchableOpacity style={styles.presetButton} onPress={setMonToSat}>
            <Text style={styles.presetText}>{t('Mon - Sat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={setMonToSun}>
            <Text style={styles.presetText}>{t('Mon - Sun')}</Text>
          </TouchableOpacity>
        </View>

        {/* Operating Hours Card */}
        <View style={{ marginTop: 32, padding: 16, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 12, textAlign: 'center' }}>
            {t('Store Operating Hours')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>
                {t('Opening Time')}
              </Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background }}
                value={openingTime}
                onChangeText={setOpeningTime}
                placeholder="09:00 AM"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>
                {t('Closing Time')}
              </Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background }}
                value={closingTime}
                onChangeText={setClosingTime}
                placeholder="09:00 PM"
              />
            </View>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>{t('Back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
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
    width: '66%',
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 30,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
    justifyContent: 'center'
  },
  dayPill: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayPillSelected: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: Colors.card,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center'
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  presetText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
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
