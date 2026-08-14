import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Item = {
  id: string;
  item_name: string;
  selling_price: string;
  cost_price: string;
  min_daily_target: string;
  min_weekly_target: string;
};

export default function ItemSetupScreen() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', item_name: '', selling_price: '', cost_price: '', min_daily_target: '', min_weekly_target: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), item_name: '', selling_price: '', cost_price: '', min_daily_target: '', min_weekly_target: '' }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const sanitizeDecimal = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      return `${parts[0]}.${parts.slice(1).join('')}`;
    }
    return clean;
  };

  const sanitizeInteger = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) return '';
    const num = parseInt(clean, 10);
    if (num > 999) return '999';
    return num.toString();
  };

  const updateItem = (id: string, field: keyof Item, value: string) => {
    let sanitizedValue = value;
    if (field === 'selling_price' || field === 'cost_price') {
      sanitizedValue = sanitizeDecimal(value);
    } else if (field === 'min_daily_target' || field === 'min_weekly_target') {
      sanitizedValue = sanitizeInteger(value);
    }
    setItems(items.map(item => item.id === id ? { ...item, [field]: sanitizedValue } : item));
  };

  const handleDone = async () => {
    const validItems = items.filter(i => i.item_name && i.selling_price && i.min_daily_target && i.min_weekly_target);

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please completely fill out at least one item.');
      return;
    }

    const hasExceededLimit = validItems.some(i => {
      const daily = parseInt(i.min_daily_target, 10) || 0;
      const weekly = parseInt(i.min_weekly_target, 10) || 0;
      return daily > 999 || weekly > 999;
    });

    if (hasExceededLimit) {
      Alert.alert('Error', 'Target quantity limit must be less than 1000 (maximum 999).');
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

      const itemsToInsert = validItems.map(item => ({
        owner_id: owner.id,
        item_name: item.item_name,
        selling_price: parseFloat(item.selling_price),
        cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
        min_daily_target: parseInt(item.min_daily_target, 10),
        min_weekly_target: parseInt(item.min_weekly_target, 10),
      }));

      const { error } = await supabase.from('items').insert(itemsToInsert);

      if (error) throw error;

      router.replace('/dashboard' as any);
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
      <Text style={styles.progressText}>{t('Step 3 of 3')}</Text>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('What do you sell?')}</Text>

        {items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t('Item')} {index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('Item Name (e.g., Milk 1L)')}
              value={item.item_name}
              onChangeText={(text) => updateItem(item.id, 'item_name', text)}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('Selling Price (₹)')}
                keyboardType="decimal-pad"
                value={item.selling_price}
                onChangeText={(text) => updateItem(item.id, 'selling_price', text)}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('Cost Price (₹) Opt.')}
                keyboardType="decimal-pad"
                value={item.cost_price}
                onChangeText={(text) => updateItem(item.id, 'cost_price', text)}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('Min Daily Target')}
                keyboardType="number-pad"
                maxLength={3}
                value={item.min_daily_target}
                onChangeText={(text) => updateItem(item.id, 'min_daily_target', text)}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder={t('Min Weekly Target')}
                keyboardType="number-pad"
                maxLength={3}
                value={item.min_weekly_target}
                onChangeText={(text) => updateItem(item.id, 'min_weekly_target', text)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={20} color={Colors.accent} />
          <Text style={styles.addButtonText}>{t('Add Another Item')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.doneButtonText}>{t('Done')}</Text>
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
    width: '100%',
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
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
