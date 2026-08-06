import { translateDynamic } from '@/lib/translationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Colors } from '../../constants/colors';
import { useGlobal } from '../../context/GlobalContext';
import { calculateBusinessHealthScore, formatDate, getStartOfWeek } from '../../hooks/useBusinessLogic';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';


export default function DashboardScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [healthScore, setHealthScore] = useState<any>(null);
  const [todaySummary, setTodaySummary] = useState({ revenue: 0, profit: 0, itemsOnTrack: 0 });
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const { hasAnimatedHealthScore, setHasAnimatedHealthScore, hasAnimatedRevenueChart, setHasAnimatedRevenueChart } = useGlobal();
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  const [isTodayLeave, setIsTodayLeave] = useState(false);

  const fetchDashboardData = async () => {
    let hasCache = false;
    // Step 1: Load from cache immediately
    try {
      const [cachedHealth, cachedSummary, cachedAlerts, cachedLeave] = await Promise.all([
        AsyncStorage.getItem('cached_health_score'),
        AsyncStorage.getItem('cached_today_summary'),
        AsyncStorage.getItem('cached_active_alerts'),
        AsyncStorage.getItem('cached_is_today_leave')
      ]);

      if (cachedHealth) {
        setHealthScore(JSON.parse(cachedHealth));
        hasCache = true;
      }
      if (cachedSummary) {
        setTodaySummary(JSON.parse(cachedSummary));
      }
      if (cachedAlerts) {
        setActiveAlerts(JSON.parse(cachedAlerts));
      }
      if (cachedLeave) {
        setIsTodayLeave(JSON.parse(cachedLeave));
      }
    } catch (e) {
      console.warn('Failed to load cache', e);
    }

    // Step 2: Fetch fresh data in background
    // Only show loading spinner if no cached data is available
    if (!hasCache) setLoading(true);


    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase
        .from('owners')
        .select('id, username')
        .eq('user_id', session.user.id)
        .single();

      if (!owner) return;
      const translatedName = await translateDynamic(owner.username || '', language);
      setUsername(translatedName);

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(
        now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()).padStart(2, '0')}`;

      const { data: todayLeave } = await supabase
        .from('shop_leaves')
        .select('id, leave_type')
        .eq('owner_id', owner.id)
        .eq('leave_date', todayStr)
        .maybeSingle();

      const isTodayLeaveVal = !!todayLeave;
      setIsTodayLeave(isTodayLeaveVal);
      await AsyncStorage.setItem('cached_is_today_leave', JSON.stringify(isTodayLeaveVal));

      // Health Score (Current Week)
      const currentWeekStartStr = formatDate(getStartOfWeek(new Date()));
      const { data: hsData } = await supabase
        .from('health_scores')
        .select('*')
        .eq('owner_id', owner.id)
        .eq('week_start_date', currentWeekStartStr)
        .maybeSingle();

      let finalHsData = hsData;
      if (!hsData && !isTodayLeaveVal) {
        const weekStart = getStartOfWeek(new Date());
        await calculateBusinessHealthScore(owner.id, formatDate(weekStart));

        const { data: newHsData } = await supabase
          .from('health_scores')
          .select('*')
          .eq('owner_id', owner.id)
          .eq('week_start_date', formatDate(weekStart))
          .maybeSingle();
        finalHsData = newHsData;
      }

      if (finalHsData) {
        setHealthScore(finalHsData);
        await AsyncStorage.setItem('cached_health_score', JSON.stringify(finalHsData));
      }

      // Today's Summary
      let activeDateStr = todayStr;

      if (isTodayLeaveVal) {
        let lastWorkingDateStr = todayStr;
        for (let i = 1; i <= 7; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(checkDate.getDate() - i);
          const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

          const { data: leaveCheck } = await supabase
            .from('shop_leaves')
            .select('id')
            .eq('owner_id', owner.id)
            .eq('leave_date', checkStr)
            .maybeSingle();

          const { data: salesCheck } = await supabase
            .from('daily_sales')
            .select('id')
            .eq('owner_id', owner.id)
            .eq('sale_date', checkStr)
            .limit(1);

          if (!leaveCheck && salesCheck && salesCheck.length > 0) {
            lastWorkingDateStr = checkStr;
            break;
          }
        }
        activeDateStr = lastWorkingDateStr;
      }

      const { data: sales } = await supabase
        .from('daily_sales')
        .select('quantity_sold, total_revenue, total_profit, item_id, items(min_daily_target, cost_price)')
        .eq('owner_id', owner.id)
        .eq('sale_date', activeDateStr);

      let revenue = 0, profit = 0, onTrack = 0;
      if (sales) {
        sales.forEach((s: any) => {
          const rev = Number(s.total_revenue) || 0;
          const qty = Number(s.quantity_sold) || 0;
          const item = Array.isArray(s.items) ? s.items[0] : s.items;

          let finalProf = 0;
          if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
            finalProf = Number(s.total_profit);
          } else if (item) {
            finalProf = rev - (Number(item.cost_price || 0) * qty);
          }

          revenue += rev;
          profit += finalProf;
          if (qty >= (item?.min_daily_target || 0)) onTrack++;
        });
      }
      const newSummary = { revenue, profit, itemsOnTrack: onTrack };
      setTodaySummary(newSummary);
      await AsyncStorage.setItem('cached_today_summary', JSON.stringify(newSummary));

      // Active Alerts
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*, items(item_name)')
        .eq('owner_id', owner.id)
        .order('triggered_at', { ascending: false })
        .limit(2);

      if (alerts) {
        setActiveAlerts(alerts);
        await AsyncStorage.setItem('cached_active_alerts', JSON.stringify(alerts));
      }

      // Revenue Trend (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startStr = formatDate(sevenDaysAgo);
      const endStr = formatDate(new Date());

      const { data: weeklySales } = await supabase
        .from('daily_sales')
        .select('sale_date, total_revenue')
        .eq('owner_id', owner.id)
        .gte('sale_date', startStr)
        .lte('sale_date', endStr);

      const dailyRevMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        dailyRevMap[formatDate(d)] = 0;
      }

      if (weeklySales) {
        weeklySales.forEach((s: any) => {
          if (dailyRevMap[s.sale_date] !== undefined) {
            dailyRevMap[s.sale_date] += Number(s.total_revenue) || 0;
          }
        });
      }

      const trendData = Object.keys(dailyRevMap).sort().map(d => ({
        value: dailyRevMap[d],
        label: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        frontColor: Colors.accent,
      }));
      setRevenueTrend(trendData);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [language])
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

  useEffect(() => {
    if (revenueTrend.length > 0 && !hasAnimatedRevenueChart) {
      const timer = setTimeout(() => {
        setHasAnimatedRevenueChart(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [revenueTrend, hasAnimatedRevenueChart]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Good morning');
    if (hour < 17) return t('Good afternoon');
    return t('Good evening');
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#16A34A';
    if (score >= 80) return '#22C55E';
    if (score >= 70) return '#84CC16';
    if (score >= 60) return '#F59E0B';
    if (score >= 50) return '#F97316';
    if (score >= 40) return '#EF4444';
    if (score >= 30) return '#DC2626';
    return '#7F1D1D';
  };

  const getVerdictLabel = (score: number) => {
    if (score >= 80) return t('Healthy');
    if (score >= 50) return t('Work in Progress');
    return t('Needs Attention');
  };

  const pieData = [
    { value: displayScore, color: healthScore ? getScoreColor(healthScore.score) : Colors.border },
    { value: 100 - displayScore, color: 'rgba(255,255,255,0.2)' },
  ];

  return (
    <View style={styles.container}
    testID="dashboard-stats-card"
    >

      {/* HEADER */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.greetingHeader} numberOfLines={2}>
            {getGreeting()}, {username}
          </Text>
          <Text style={styles.greetingSubtext}>
            {t('Track your business performance in real-time')}
          </Text>
        </View>

        <TouchableOpacity
          testID="nav-profile"
          style={styles.avatar}
          onPress={() => router.push('/dashboard/profile' as any)}
        >
          <Text style={styles.avatarText}>
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchDashboardData}
          />
        }
      >
        {isTodayLeave && (
          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#F59E0B',
          }}>
            <Text style={{ fontSize: 16 }}>🏖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: 'bold',
                color: '#854F0B'
              }}>
                {t('Shop is on Leave Today')}
              </Text>
              <Text style={{ fontSize: 12, color: '#854F0B' }}>
                {t('Showing data from last working day')}
              </Text>
            </View>
          </View>
        )}

        {/* HEALTH SCORE CARD */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/dashboard/health-score' as any)}
        >
          <LinearGradient
            colors={[Colors.primary, '#2D5A8E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.healthCardNew}
          >

            <View style={styles.healthTopRow}>
              <View>
                <Text style={styles.healthTitle}>
                  {t('Business Health Score')}
                </Text>

                <Text style={styles.healthWeek}>
                  {t('This Week')}
                </Text>
              </View>

              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>
                  {healthScore
                    ? getVerdictLabel(healthScore.score)
                    : '--'}
                </Text>
              </View>
            </View>

            <View style={styles.healthMiddleRow}>

              {/* DONUT */}
              <View style={styles.chartBox}>
                <PieChart
                  donut
                  radius={58}
                  innerRadius={45}
                  data={pieData}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: healthScore
                              ? getScoreColor(healthScore.score)
                              : Colors.primary,
                          },
                        ]}
                      >
                        {displayScore || '--'}
                      </Text>
                      <Text style={styles.outOf}>
                        /100
                      </Text>
                    </View>
                  )}
                />
              </View>

              {/* VERDICT */}
              <View style={styles.healthInfo}>
                <Text style={styles.healthVerdict}>
                  {healthScore
                    ? getVerdictLabel(healthScore.score)
                    : t('Calculating')}
                </Text>

                <Text style={styles.healthDesc}>
                  {t('Monitor sales, profits and targets')}
                </Text>
              </View>

            </View>

            {/* METRICS */}
            <View style={styles.metricsGridNew}>

              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>
                  {isTodayLeave ? t('Last Working Day Revenue') : t('Revenue')}
                </Text>

                <Text style={styles.metricNumber}>
                  ₹{todaySummary.revenue.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>
                  {isTodayLeave ? t('Last Working Day Profit') : t('Profit')}
                </Text>

                <Text style={styles.metricNumber}>
                  ₹{todaySummary.profit.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>
                  {t('Alerts')}
                </Text>

                <Text
                  style={[
                    styles.metricNumber,
                    activeAlerts.length > 0 && {
                      color: Colors.danger,
                    },
                  ]}
                >
                  {activeAlerts.length}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>
                  {isTodayLeave ? t('Last Working Day Track') : t('On Track')}
                </Text>

                <Text style={styles.metricNumber}>
                  {todaySummary.itemsOnTrack}
                </Text>
              </View>

            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          {t('Quick Actions')}
        </Text>

        <View style={styles.quickGrid}>

          <TouchableOpacity
            testID="nav-sales-entry"
            style={styles.quickCard}
            onPress={() =>
              router.push('/dashboard/sales-entry' as any)
            }
          >
            <Ionicons
              name="add-circle"
              size={28}
              color={Colors.accent}
            />

            <Text style={styles.quickText}>
              {t('Sales Entry')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="nav-reports"
            style={styles.quickCard}
            onPress={() =>
              router.push('/dashboard/reports' as any)
            }
          >
            <Ionicons
              name="bar-chart"
              size={28}
              color={Colors.accent}
            />

            <Text style={styles.quickText}>
              {t('Reports')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              router.push('/dashboard/health-score' as any)
            }
          >
            <Ionicons
              name="pulse"
              size={28}
              color={Colors.accent}
            />

            <Text style={styles.quickText}>
              {t('Health')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="nav-profile"
            style={styles.quickCard}
            onPress={() =>
              router.push('/dashboard/profile' as any)
            }
          >
            <Ionicons
              name="person"
              size={28}
              color={Colors.accent}
            />

            <Text style={styles.quickText}>
              {t('Profile')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ALERTS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>
            {t('Recent Alerts')}
          </Text>
          <TouchableOpacity
            testID="nav-alerts"          // ← ADD THIS
            onPress={() => router.push('/dashboard/alerts' as any)}
          >
            <Text style={{ color: Colors.accent, fontWeight: '600', fontSize: 14 }}>
              {t('View All')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {activeAlerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color={Colors.success}
            />

            <Text style={styles.emptyTitle}>
              {t('No Active Alerts')}
            </Text>

            <Text style={styles.emptyDesc}>
              {t("You're doing great this week")}
            </Text>
          </View>
        ) : (
          activeAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCardNew}>
              <View style={styles.alertTop}>
                <Text style={styles.alertItem}>
                  {alert.items.item_name}
                </Text>

                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor:
                        alert.alert_level === 'Critical'
                          ? Colors.danger
                          : Colors.warning,
                    },
                  ]}
                >
                  <Text style={styles.levelText}>
                    {alert.alert_level}
                  </Text>
                </View>
              </View>

              <Text style={styles.alertMsg}>
                {alert.alert_message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 18,
    backgroundColor: Colors.primary,
    borderBottomWidth: 0,
  },
  greetingHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  greetingSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  brand: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconButton: { position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0, width: 10, height: 10,
    borderRadius: 5, backgroundColor: Colors.danger,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.card, fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20 },
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  healthCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
    borderTopColor: Colors.border,
  },
  newCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  newThisWeekLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  newScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  ringChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newScoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  verdictWrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  newVerdictText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  newVerdictSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  newMetricsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  newMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newMetricCell: {
    flex: 1,
    paddingVertical: 8,
  },
  newMetricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  newMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  newVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  newHorizontalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  metricsContainer: { width: '100%' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCell: { flex: 1, alignItems: 'flex-start' },
  metricCellLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  metricCellValue: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
  metricDivider: { width: 1, height: 40, backgroundColor: Colors.border, marginHorizontal: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.card, padding: 15, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  alertCard: { backgroundColor: Colors.card, padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: Colors.warning, borderWidth: 1, borderColor: Colors.border },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  alertBadgeText: { color: Colors.card, fontSize: 10, fontWeight: 'bold' },
  alertItemName: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary, flex: 1 },
  alertDate: { fontSize: 10, color: Colors.textSecondary },
  alertMessage: { fontSize: 14, color: Colors.textSecondary },
  chartContainer: { marginTop: 10, alignItems: 'center' },
  scoreRing: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  verdict: { fontSize: 16, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.background, padding: 10, borderRadius: 8, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },

  healthCardNew: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },

  headerSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  greetingWrapper: {
    marginBottom: 24,
  },

  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },

  healthTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  healthTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  healthWeek: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  healthBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  healthBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  healthMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },

  chartBox: {
    marginRight: 18,
  },

  scoreText: {
    fontSize: 30,
    fontWeight: 'bold',
  },

  outOf: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },

  healthInfo: {
    flex: 1,
  },

  healthVerdict: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  healthDesc: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    lineHeight: 20,
  },

  metricsGridNew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 28,
  },

  metricCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },

  metricTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },

  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },

  quickCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  quickText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 14,
  },

  emptyDesc: {
    color: Colors.textSecondary,
    marginTop: 6,
  },

  alertCardNew: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  alertItem: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },

  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  levelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  alertMsg: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
