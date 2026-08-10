import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { translateDynamic } from '@/lib/translationService';
import { getStartOfWeek } from '../../hooks/useBusinessLogic';

const FILTERS = ['All', 'Warning', 'Alert', 'Critical', 'Dead Stock'];

export default function AlertsScreen() {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
      if (!owner) return;

      // 1. Delete alerts older than the start of this week from Supabase
      const weekStart = getStartOfWeek(new Date());
      // Zero out time so deletion only removes truly old alerts (before Monday 00:00:00)
      weekStart.setHours(0, 0, 0, 0);
      await supabase
        .from('alerts')
        .delete()
        .eq('owner_id', owner.id)
        .lt('triggered_at', weekStart.toISOString());

      // 2. Retrieve active alerts from this week
      const { data } = await supabase
        .from('alerts')
        .select('*, items(item_name)')
        .eq('owner_id', owner.id)
        .gte('triggered_at', weekStart.toISOString())
        .order('triggered_at', { ascending: false });

      if (data) {
        const today = new Date();
        const translatedAlerts = await Promise.all(
          data.map(async (alert: any) => {
            const alertDate = new Date(alert.triggered_at);
            const isToday = alertDate.getDate() === today.getDate() &&
                            alertDate.getMonth() === today.getMonth() &&
                            alertDate.getFullYear() === today.getFullYear();
            return {
              ...alert,
              isToday,
              items: alert.items
                ? { ...alert.items, item_name: await translateDynamic(alert.items.item_name, language) }
                : alert.items,
              suggested_action: alert.suggested_action
                ? await translateDynamic(alert.suggested_action, language)
                : alert.suggested_action,
            };
          })
        );
        setAlerts(translatedAlerts);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [language])
  );

  const dismissAlert = async (id: string) => {
    try {
      // Mark as read in DB
      await supabase.from('alerts').update({ is_read: true }).eq('id', id);
      // Immediately remove from screen so it is completely gone (not faded)
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'Critical': return Colors.danger;
      case 'Dead Stock': return Colors.deadstock;
      case 'Alert': return Colors.warning;
      case 'Warning': return Colors.accent;
      default: return Colors.primary;
    }
  };

  const filteredAlerts = activeFilter === 'All' ? [...alerts] : alerts.filter(a => a.alert_level === activeFilter);

  const severityMap: Record<string, number> = { 'Dead Stock': 4, 'Critical': 3, 'Alert': 2, 'Warning': 1 };
  filteredAlerts.sort((a, b) => (severityMap[b.alert_level] || 0) - (severityMap[a.alert_level] || 0));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Alerts')}</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{t(filter)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : filteredAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('No active alerts found.')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {filteredAlerts.map(alert => (
            <View key={alert.id} style={[styles.card, !alert.isToday && styles.cardShadowed, { borderLeftColor: getAlertColor(alert.alert_level) }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: getAlertColor(alert.alert_level) }]}>
                  <Text style={styles.badgeText}>{t(alert.alert_level)}</Text>
                </View>
                {alert.isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>TODAY</Text>
                  </View>
                )}
                <Text style={styles.itemName}>{alert.items?.item_name}</Text>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => dismissAlert(alert.id)}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={Colors.success} 
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.dateText}>
                  {new Date(alert.triggered_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.message}>{t(alert.alert_message)}</Text>
              {alert.suggested_action && (
                <Text style={styles.action}>{alert.suggested_action}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  filterContainer: { paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: Colors.card },
  loader: { flex: 1, justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4 },
  cardShadowed: { opacity: 0.6, backgroundColor: '#F3F4F6' },
  todayBadge: { backgroundColor: 'rgba(244, 168, 51, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  todayBadgeText: { color: '#B45309', fontSize: 9, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: Colors.card, fontSize: 10, fontWeight: 'bold' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, flex: 1 },
  dismissBtn: { padding: 4 },
  message: { fontSize: 14, color: Colors.textPrimary, marginBottom: 8 },
  action: { fontSize: 12, fontStyle: 'italic', color: Colors.textSecondary },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  dateText: { fontSize: 12, color: Colors.textSecondary },
});
