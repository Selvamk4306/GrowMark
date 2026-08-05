import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { INSIGHT_VARIATIONS } from '../../hooks/useBusinessLogic';
import { useTranslation } from '../../hooks/useTranslation';
import { translateBatch } from '@/lib/translationService';

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GrowthTipsScreen() {
  const router = useRouter();
  const { language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<{ title: string, desc: string, icon: any }[]>([]);

  useFocusEffect(
    useCallback(() => {
      generateTips();
    }, [language])
  );

  const generateTips = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
      if (!owner) return;

      // Fetch alerts
      const { data: alerts } = await supabase.from('alerts').select('*').eq('owner_id', owner.id).eq('is_read', false);
      
      // Fetch latest health score
      const { data: hs } = await supabase.from('health_scores').select('*').eq('owner_id', owner.id).order('week_start_date', { ascending: false }).limit(1).single();

      const newTips = [];

      if (alerts) {
        const hasConsecutiveMisses = alerts.some(a => a.days_missed >= 3);
        if (hasConsecutiveMisses) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Combo']);
          newTips.push({ title: v.title, desc: v.desc, icon: 'pricetags' });
        }

        const hasDeadStock = alerts.some(a => a.alert_level === 'Dead Stock');
        if (hasDeadStock) {
          newTips.push({
            title: 'Dead Stock Detected',
            desc: 'An item has zero movement. Consider a heavy clearance discount.',
            icon: 'warning'
          });
        }
      }

      if (hs) {
        if (hs.revenue_growth < 100) { 
          const v = getRandomItem(INSIGHT_VARIATIONS['Revenue Drop']);
          newTips.push({ title: v.title, desc: v.desc, icon: 'trending-down' });
        }

        if (hs.profit_margin < 20) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Low Margin']);
          newTips.push({ title: v.title, desc: v.desc, icon: 'wallet' });
        }
      }

      // Add a default tip if empty
      if (newTips.length === 0) {
        const v = getRandomItem(INSIGHT_VARIATIONS['Default']);
        newTips.push({ title: v.title, desc: v.desc, icon: 'star' });
      }

      const titles = newTips.map(tip => tip.title);
      const descs = newTips.map(tip => tip.desc);
      const translatedTitles = await translateBatch(titles, language);
      const translatedDescs = await translateBatch(descs, language);
      setTips(newTips.map((tip, i) => ({ ...tip, title: translatedTitles[i], desc: translatedDescs[i] })));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>This Week's Insights</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {tips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Insufficient data to generate tips right now.</Text>
          </View>
        ) : (
          tips.map((tip, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name={tip.icon as any} size={24} color={Colors.card} />
              </View>
              <View style={styles.textContent}>
                <Text style={styles.cardTitle}>{tip.title}</Text>
                <Text style={styles.cardDesc}>{tip.desc}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { marginRight: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  content: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 40 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  textContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 5 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
