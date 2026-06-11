import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate, getStartOfWeek, calculateBusinessHealthScore } from '../../hooks/useBusinessLogic';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from '../../hooks/useTranslation';
import { useGlobal } from '../../context/GlobalContext';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function HealthScoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [healthScore, setHealthScore] = useState<any>(null);
  const { hasAnimatedHealthScore, setHasAnimatedHealthScore } = useGlobal();
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      fetchHealthScore();
    }, [])
  );

  useEffect(() => {
    if (healthScore) {
      if (!hasAnimatedHealthScore) {
        // Run animation only once
        animatedScore.setValue(0);
        setDisplayScore(0);

        Animated.timing(animatedScore, {
          toValue: healthScore.score,
          duration: 1500,
          useNativeDriver: false,
        }).start(() => {
          setHasAnimatedHealthScore(true);
        });

        const id = animatedScore.addListener(({ value }) => {
          setDisplayScore(Math.round(value));
        });

        return () => animatedScore.removeListener(id);
      } else {
        // Skip animation and set values immediately
        animatedScore.setValue(healthScore.score);
        setDisplayScore(healthScore.score);
      }
    }
  }, [healthScore, hasAnimatedHealthScore]);

  const fetchHealthScore = async () => {
    let hasCache = false;
    // Step 1: Load from cache
    try {
      const cached = await AsyncStorage.getItem('cached_health_score');
      if (cached) {
        setHealthScore(JSON.parse(cached));
        hasCache = true;
      }
    } catch (e) {}

    // Step 2: Background fetch
    if (!hasCache) setLoading(true);


    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase.from('owners').select('id').eq('user_id', session.user.id).single();
      if (!owner) return;

      const { data } = await supabase
        .from('health_scores')
        .select('*')
        .eq('owner_id', owner.id)
        .order('week_start_date', { ascending: false })
        .maybeSingle();
      
      let finalData = data;
      if (!data) {
        const weekStart = getStartOfWeek(new Date());
        await calculateBusinessHealthScore(owner.id, formatDate(weekStart));
        
        const { data: newData } = await supabase
          .from('health_scores')
          .select('*')
          .eq('owner_id', owner.id)
          .eq('week_start_date', formatDate(weekStart))
          .maybeSingle();
        finalData = newData;
      }

      if (finalData) {
        setHealthScore(finalData);
        await AsyncStorage.setItem('cached_health_score', JSON.stringify(finalData));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 50) return Colors.warning;
    return Colors.danger;
  };

  const getRevenueLabel = (val: number) => {
    if (val >= 80) return "Strong revenue growth this week";
    if (val >= 50) return "Revenue growth is moderate";
    return "Revenue has dropped compared to last week";
  };

  const getProfitLabel = (val: number) => {
    if (val >= 80) return "Healthy profit margin across items";
    if (val >= 50) return "Profit margin is acceptable but can improve";
    return "Low profit margin — review your cost prices";
  };

  const getTargetLabel = (val: number) => {
    if (val >= 100) return "All items met their daily targets";
    if (val >= 70) return "Most items on track — a few need attention";
    return "Several items are missing daily targets";
  };

  const getExpenseLabel = (val: number) => {
    if (val >= 80) return "Expenses are well under control";
    if (val >= 50) return "Expenses are slightly high this week";
    return "Expenses are too high — review your costs";
  };

  const getVerdictContent = (score: number) => {
    if (score >= 80) return {
      title: "Your Business is Thriving",
      subtitle: "Strong sales, healthy profit, and great target achievement this week."
    };
    if (score >= 50) return {
      title: "Work in Progress",
      subtitle: "Small changes this week can push your score into the healthy zone."
    };
    return {
      title: "Immediate Action Needed",
      subtitle: "Multiple areas are underperforming. Review your alerts for details."
    };
  };


  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!healthScore) {
    return (
      <View style={styles.container}>
         <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Health Score')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('No Health Score data available.')}</Text>
        </View>
      </View>
    );
  }

  const pieData = [
    { value: displayScore, color: getScoreColor(healthScore.score) },
    { value: 100 - displayScore, color: '#E5E7EB' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Health Score')}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Main Score Donut */}
        <View style={styles.scoreContainer}>
          <PieChart
            donut
            radius={100}
            innerRadius={85}
            data={pieData}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={[styles.mainScoreText, { color: getScoreColor(healthScore.score) }]}>
                  {displayScore}
                </Text>
                <Text style={styles.outOfText}>{t('out of 100')}</Text>
              </View>
            )}
          />
          <Text style={styles.dateLabel}>{t('Week of')} {healthScore.week_start_date}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Score Breakdown')}</Text>
            
            <View style={styles.barContainer}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{t('Revenue Growth')} (30%)</Text>
                <Text style={styles.barValue}>{Math.round(healthScore.revenue_growth)}%</Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, healthScore.revenue_growth))}%` }]} />
              </View>
              <Text style={styles.componentDetail}>{t(getRevenueLabel(healthScore.revenue_growth))}</Text>
            </View>

            <View style={styles.barContainer}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{t('Profit Margin')} (30%)</Text>
                <Text style={styles.barValue}>{Math.round(healthScore.profit_margin)}%</Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, healthScore.profit_margin))}%` }]} />
              </View>
              <Text style={styles.componentDetail}>{t(getProfitLabel(healthScore.profit_margin))}</Text>
            </View>

            <View style={styles.barContainer}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{t('Target Achievement')} (20%)</Text>
                <Text style={styles.barValue}>{Math.round(healthScore.target_achievement_rate)}%</Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, healthScore.target_achievement_rate))}%` }]} />
              </View>
              <Text style={styles.componentDetail}>{t(getTargetLabel(healthScore.target_achievement_rate))}</Text>
            </View>

            <View style={styles.barContainer}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{t('Expense Control')} (20%)</Text>
                <Text style={styles.barValue}>{Math.round(healthScore.expense_control)}%</Text>
              </View>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, healthScore.expense_control))}%` }]} />
              </View>
              <Text style={styles.componentDetail}>{t(getExpenseLabel(healthScore.expense_control))}</Text>
            </View>
          </View>

        <View style={[styles.verdictCard, { borderLeftColor: getScoreColor(healthScore.score) }]}>
          <Text style={styles.verdictTitle}>{t('Verdict')}</Text>
            <Text style={[styles.verdictText, { color: getScoreColor(healthScore.score) }]}>
              {t(getVerdictContent(healthScore.score).title)}
            </Text>
            <Text style={styles.verdictDesc}>
              {t(getVerdictContent(healthScore.score).subtitle)}
            </Text>
          </View>

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
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  scoreContainer: { alignItems: 'center', marginVertical: 30, justifyContent: 'center' },
  centerLabel: { alignItems: 'center', justifyContent: 'center' },
  mainScoreText: { fontSize: 48, fontWeight: 'bold' },
  outOfText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  dateLabel: { fontSize: 14, color: Colors.textSecondary, marginTop: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginBottom: 20 },
  barContainer: { marginBottom: 15 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  barValue: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary },
  barBackground: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 4 },
  verdictCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4 },
  verdictTitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 5 },
  verdictText: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  verdictDesc: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  componentDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
});
