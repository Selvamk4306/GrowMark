import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../hooks/useBusinessLogic';
import DatePickerModal from '../../components/DatePickerModal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { translateBatch } from '@/lib/translationService';

export default function DailyAnalysisScreen() {
  const { t, language } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, metTarget: 0 });
  const router = useRouter();

  const fetchAnalysis = async (dateStr: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
      if (!owner) return;

      const { data: sales } = await supabase
        .from('daily_sales')
        .select('quantity_sold, total_revenue, total_profit, items(item_name, min_daily_target, cost_price)')
        .eq('owner_id', owner.id)
        .eq('sale_date', dateStr);

      if (sales) {
        let revTotal = 0, profTotal = 0, metCount = 0;
        const processed = sales.map((s: any) => {
          const rev = Number(s.total_revenue) || 0;
          const qty = Number(s.quantity_sold) || 0;
          const item = Array.isArray(s.items) ? s.items[0] : s.items;
          const costPrice = Number(item?.cost_price || 0);

          let currentProf = 0;
          if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
            currentProf = Number(s.total_profit);
          } else if (item) {
            currentProf = rev - (costPrice * qty);
          }

          revTotal += rev;
          profTotal += currentProf;
          
          const target = item?.min_daily_target || 0;
          let status = t('Met Target');
          let color = Colors.success;
          if (qty === 0) { status = t('Zero Sales'); color = Colors.deadstock; }
          else if (qty < target) { status = t('Below Target'); color = Colors.warning; }
          else { metCount++; }

          return {
            name: item?.item_name,
            qty,
            target,
            revenue: rev,
            profit: currentProf,
            status,
            color
          };
        });
        const itemNames = processed.map((p: any) => p.name || '');
        const translatedNames = await translateBatch(itemNames, language);
        const translatedProcessed = processed.map((p: any, i: number) => ({ ...p, name: translatedNames[i] }));
        setAnalysis(translatedProcessed);
        setSummary({ revenue: revTotal, profit: profTotal, metTarget: metCount });
      } else {
        setAnalysis([]);
        setSummary({ revenue: 0, profit: 0, metTarget: 0 });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(selectedDate);
  }, [selectedDate, language]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Daily Analysis')}</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateText}>{selectedDate === formatDate(new Date()) ? t('Today') : selectedDate}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={setSelectedDate}
      />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : analysis.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('No data for')} {selectedDate}.</Text>
          <TouchableOpacity style={styles.entryBtn} onPress={() => router.push('/dashboard/sales-entry' as any)}>
            <Text style={styles.entryBtnText}>{t('Enter Sales Data')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Summary Strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('Revenue')}</Text>
              <Text style={styles.summaryValue}>₹{summary.revenue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('Profit')}</Text>
              <Text style={styles.summaryValue}>₹{summary.profit.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('Met Target')}</Text>
              <Text style={styles.summaryValue}>{summary.metTarget} / {analysis.length}</Text>
            </View>
          </View>

          {/* Item Cards */}
          {analysis.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>{item.qty}</Text>
                  <Text style={styles.statLabel}>{t('Sold')} ({t('Target')}: {item.target})</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>₹{item.revenue.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statLabel}>{t('Revenue')}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>₹{item.profit.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statLabel}>{t('Profit')}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: { padding: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  dateText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginBottom: 20 },
  entryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  entryBtnText: { color: Colors.card, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  summaryStrip: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 12, padding: 15, marginBottom: 20, justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: Colors.highlight, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: Colors.card, fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: Colors.card, fontSize: 10, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  statCol: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  backBtn: {
    padding: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  }
  
});
