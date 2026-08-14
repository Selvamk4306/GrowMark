import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Colors } from '../../constants/colors';
import { formatDate, getStartOfWeek, runThresholdCheck, runConsecutiveFailureDetection, calculateBusinessHealthScore } from '../../hooks/useBusinessLogic';
import DatePickerModal from '../../components/DatePickerModal';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { translateBatch } from '@/lib/translationService';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

type ItemEntry = {
  id: string;
  item_name: string;
  min_daily_target: number;
  selling_price: number;
  cost_price: number;
  quantity: number;
};

export default function SalesEntryScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [isLeaveDay, setIsLeaveDay] = useState(false);
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  const { t, language } = useTranslation();

  const fetchItemsAndSales = async (dateStr: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let currentOwnerId = ownerId;
      if (!currentOwnerId) {
        const { data: owner } = await supabase.from('owners').select('*').eq('user_id', session.user.id).single();
        if (owner) {
          currentOwnerId = owner.id;
          setOwnerId(currentOwnerId);
          if (owner.working_days) setWorkingDays(owner.working_days);
        }
      }

      if (!currentOwnerId) return;

      // Check if it's a leave day
      const { data: leaveData } = await supabase
        .from('shop_leaves')
        .select('id, leave_type, note')
        .eq('owner_id', currentOwnerId)
        .eq('leave_date', dateStr)
        .maybeSingle();

      setIsLeaveDay(!!leaveData);

      // Fetch all items for owner
      const { data: dbItems } = await supabase.from('items').select('*').eq('owner_id', currentOwnerId);

      // Fetch sales for selected date
      const { data: sales } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('owner_id', currentOwnerId)
        .eq('sale_date', dateStr);

      const hasSales = Boolean(sales && sales.length > 0);
      setIsEditMode(hasSales);

      if (dbItems) {
        const entries: ItemEntry[] = dbItems.map((item: any) => {
          const existingSale = hasSales ? sales?.find((s: any) => s.item_id === item.id) : null;
          return {
            id: item.id,
            item_name: item.item_name,
            min_daily_target: item.min_daily_target,
            selling_price: item.selling_price,
            cost_price: item.cost_price,
            quantity: existingSale ? existingSale.quantity_sold : 0,
          };
        });
        const names = entries.map(e => e.item_name);
        const translatedNames = await translateBatch(names, language);
        setItems(entries.map((e, i) => ({ ...e, item_name: translatedNames[i] })));
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsAndSales(selectedDate);
  }, [selectedDate, language]);

  useFocusEffect(
    useCallback(() => {
      fetchItemsAndSales(selectedDate);
    }, [selectedDate])
  );

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const markAsLeave = async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      await supabase.from('daily_sales').delete().eq('owner_id', ownerId).eq('sale_date', selectedDate);
      const { error } = await supabase.from('shop_leaves').insert({
        owner_id: ownerId,
        leave_date: selectedDate,
        leave_type: 'Leave',
        note: 'Marked from app'
      });
      if (error) throw error;
      
      // Recalculate health score (leave days adjust active working days count)
      const weekStart = getStartOfWeek(new Date(selectedDate));
      await calculateBusinessHealthScore(ownerId, formatDate(weekStart));

      // Clear cached dashboard data
      await AsyncStorage.multiRemove([
        'cached_health_score',
        'cached_today_summary',
        'cached_active_alerts',
        'cached_is_today_leave'
      ]);

      setIsLeaveDay(true);
      setItems(items.map(item => ({ ...item, quantity: 0 })));
      Alert.alert(t('Success'), t('Marked as leave day!'));
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeLeave = async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('shop_leaves').delete().eq('owner_id', ownerId).eq('leave_date', selectedDate);
      if (error) throw error;
      
      // Clear cached dashboard data
      await AsyncStorage.multiRemove([
        'cached_health_score',
        'cached_today_summary',
        'cached_active_alerts',
        'cached_is_today_leave'
      ]);

      setIsLeaveDay(false);
      Alert.alert(t('Success'), t('Leave removed. You can now enter sales.'));
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!ownerId) return;
    setSubmitting(true);
    try {
      // Automatically delete any leave entry for this date since we are submitting sales!
      await supabase.from('shop_leaves').delete().eq('owner_id', ownerId).eq('leave_date', selectedDate);

      // Upsert daily sales
      const salesToUpsert = items.map(item => ({
        owner_id: ownerId,
        item_id: item.id,
        sale_date: selectedDate,
        quantity_sold: item.quantity,
        total_revenue: item.quantity * item.selling_price,
        total_profit: item.quantity * (item.selling_price - (item.cost_price || 0)),
      }));

      // Delete existing for this date and insert
      if (isEditMode) {
        await supabase.from('daily_sales').delete().eq('owner_id', ownerId).eq('sale_date', selectedDate);
      }

      const { error } = await supabase.from('daily_sales').insert(salesToUpsert);
      if (error) throw error;

      // Run threshold logic
      for (const item of items) {
        await runThresholdCheck(ownerId, item.id, selectedDate, item.quantity);
        await runConsecutiveFailureDetection(ownerId, item.id, selectedDate);
      }

      // Recalculate health score for the week of the selected date
      const weekStart = getStartOfWeek(new Date(selectedDate));
      await calculateBusinessHealthScore(ownerId, formatDate(weekStart));

      // Clear cached dashboard data to force immediate refresh
      await AsyncStorage.multiRemove([
        'cached_health_score',
        'cached_today_summary',
        'cached_active_alerts',
        'cached_is_today_leave'
      ]);

      Alert.alert(t('Success'), t('Sales data saved successfully!'));
      setIsEditMode(true);
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = selectedDate === formatDate(new Date());

  return (
    <LinearGradient
      colors={['#F5F7FA', '#F5F7FA']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('Sales Entry')}</Text>
        <TouchableOpacity 
        testID="date-selector-button"
        style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={18} color="#F4A833" />
          <Text style={styles.dateText}>{isToday ? t('Today') : selectedDate}</Text>
          <Ionicons name="chevron-down" size={14} color="#1E3A5F" />
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={setSelectedDate}
        workingDays={workingDays}
      />

      {isLeaveDay ? (
        <View style={styles.leaveContainer}>
          <Text style={styles.emoji}>🏖️</Text>
          <Text style={styles.leaveTitle}>{t('Shop is on Leave')}</Text>
          <Text style={styles.leaveSub}>{t('No sales can be entered for this date because it is marked as a leave day.')}</Text>
          <TouchableOpacity style={styles.removeLeaveBtn} onPress={removeLeave}>
            <Text style={styles.removeLeaveText}>{t('Remove Leave')}</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F4A833" />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemTarget}>{t('Target')}: {item.min_daily_target} / {t('day')}</Text>
              </View>

              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => updateQuantity(item.id, -1)} activeOpacity={0.7}>
                  <Ionicons name="remove" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TextInput
                  testID={`quantity-input-${item.id}`}
                  style={[styles.qtyInput, focusedInputId === item.id && styles.qtyInputFocused]}
                  value={String(item.quantity)}
                  keyboardType="number-pad"
                  onFocus={() => setFocusedInputId(item.id)}
                  onBlur={() => setFocusedInputId(null)}
                  onChangeText={(val) => {
                    const raw = val.replace(/[^0-9]/g, '');
                    const cleaned = raw.replace(/^0+(?=\d)/, '');
                    const num = parseInt(cleaned, 10) || 0;
                    setItems(items.map(i => i.id === item.id ? { ...i, quantity: num } : i));
                  }}
                  selectTextOnFocus
                />
                <TouchableOpacity style={styles.stepBtn} onPress={() => updateQuantity(item.id, 1)} activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {!isLeaveDay && !loading && (
        <View style={styles.footer}>
          <TouchableOpacity 
          testID="sales-submit-button"
          style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>{isEditMode ? t('Update Sales') : t('Submit Sales')}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.leaveRow}>
            <TouchableOpacity  
            testID="mark-leave-button"
            style={styles.markLeaveBtn} onPress={markAsLeave} disabled={submitting} activeOpacity={0.7}>
              <Text style={styles.markLeaveText}>{t('Mark as Leave')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB'
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E3A5F' },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 6
  },
  dateText: { fontSize: 14, fontWeight: '600', color: '#1E3A5F' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingVertical: 20 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 },
  itemTarget: { fontSize: 12, color: '#6B7280' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 4
  },
  stepBtn: {
    backgroundColor: '#F4A833',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F4A833'
  },
  qtyInput: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 55,
    textAlign: 'center',
    color: '#1E3A5F',
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 4,
    marginHorizontal: 4
  },
  qtyInputFocused: {
    borderColor: '#1E3A5F',
    backgroundColor: '#EBF5FF',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E5E7EB'
  },
  submitBtn: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  leaveRow: { flexDirection: 'row', marginTop: 10 },
  markLeaveBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E3A5F'
  },
  markLeaveText: { color: '#1E3A5F', fontWeight: '600' },
  leaveContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emoji: { fontSize: 60, marginBottom: 20 },
  leaveTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 10 },
  leaveSub: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 30 },
  removeLeaveBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E3A5F'
  },
  removeLeaveText: { color: '#1E3A5F', fontSize: 16, fontWeight: '600' }
});
