import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  InteractionManager,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { BarChart as GiftedBarChart, LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { getStartOfWeek, formatDate } from '../../hooks/useBusinessLogic';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useGlobal } from '../../context/GlobalContext';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ChartErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Chart rendering error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <Text style={{ color: '#EF4444', padding: 20 }}>Unable to load chart</Text>;
    }
    return this.props.children;
  }
}

// ─── Animated metric (isolated so its Animated.Value work stays local) ───────
type AnimatedMetricValueProps = {
  targetValue: number;
  isRevenue?: boolean;
  hasAnimated: boolean;
  loading: boolean;
  onAnimated?: () => void;
};

function AnimatedMetricValue({ targetValue, isRevenue, hasAnimated, loading, onAnimated }: AnimatedMetricValueProps) {
  const anim = useRef(new Animated.Value(hasAnimated ? targetValue : 0)).current;
  const [displayVal, setDisplayVal] = useState(hasAnimated ? targetValue : 0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let active = true;
    const listenerId = anim.addListener(({ value }) => {
      if (active) setDisplayVal(Math.round(value));
    });

    if (!hasAnimated && !loading) {
      anim.setValue(0);
      const animInstance = Animated.timing(anim, {
        toValue: targetValue,
        duration: 1500,
        useNativeDriver: false,
      });
      animationRef.current = animInstance;
      animInstance.start(() => {
        if (active && isRevenue && onAnimated) {
          onAnimated();
        }
      });
    } else if (hasAnimated) {
      setDisplayVal(targetValue);
    }

    return () => {
      active = false;
      anim.removeListener(listenerId);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [targetValue, hasAnimated, loading, anim, isRevenue, onAnimated]);

  return <Text style={styles.summaryValue}>₹{displayVal.toLocaleString('en-IN')}</Text>;
}

// ─── Memoised style objects (avoid new references each render) ────────────────
const yAxisTextStyle = { color: '#6B7280', fontSize: 10 };
const xAxisLabelTextStyle = { color: '#6B7280', fontSize: 10 };

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalProfit: 0, bestItem: '-', activeAlerts: 0 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { hasAnimatedRevenueChart, setHasAnimatedRevenueChart } = useGlobal();
  const [tooltipData, setTooltipData] = useState<any>(null);

  // Charts are deferred until after navigation transitions finish
  const [chartsReady, setChartsReady] = useState(false);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  const handleBarPress = useCallback((_index: number, item: any) => {
    setTooltipData({
      day: item.label,
      date: item.fullDate,
      revenue: item.value,
      profit: item.profit,
      itemCount: item.itemCount,
    });
  }, []);

  const dismissTooltip = useCallback(() => {
    setTooltipData(null);
  }, []);

  // ─── data fetching ─────────────────────────────────────────────────────────
  const fetchReportData = useCallback(async (weekStart: Date) => {
    if (!isComponentMounted.current) return;
    setLoading(true);
    setChartsReady(false); // hide charts while loading
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: owner } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (!owner) return;

      const ownerWorkingDays = owner.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startStr = formatDate(weekStart);
      const endStr = formatDate(weekEnd);

      const { data: sales } = await supabase
        .from('daily_sales')
        .select('sale_date, total_revenue, total_profit, quantity_sold, items(item_name, cost_price)')
        .eq('owner_id', owner.id)
        .gte('sale_date', startStr)
        .lte('sale_date', endStr);

      const { data: alerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('owner_id', owner.id)
        .gte('triggered_at', startStr)
        .lte('triggered_at', endStr);

      let totRev = 0, totProf = 0;
      const dailyRevMap: Record<string, number> = {};
      const dailyProfMap: Record<string, number> = {};
      const dailyAlertMap: Record<string, number> = {};
      const itemRevMap: Record<string, number> = {};
      const dailyQtyMap: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const key = formatDate(d);
        dailyRevMap[key] = 0;
        dailyProfMap[key] = 0;
        dailyAlertMap[key] = 0;
        dailyQtyMap[key] = 0;
      }

      if (sales) {
        sales.forEach((s: any) => {
          const rev = Number(s.total_revenue) || 0;
          const qty = Number(s.quantity_sold) || 0;
          const item = Array.isArray(s.items) ? s.items[0] : s.items;

          let finalProf = 0;
          if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
            finalProf = Number(s.total_profit);
          } else if (item) {
            const costPrice = Number(item.cost_price || 0);
            finalProf = rev - (costPrice * qty);
          }

          totRev += rev;
          totProf += finalProf;
          const dateKey = s.sale_date;
          if (dateKey && dailyRevMap[dateKey] !== undefined) {
            dailyRevMap[dateKey] += rev;
            dailyProfMap[dateKey] += finalProf;
            dailyQtyMap[dateKey] += qty;
          }

          const itemName = s.items?.item_name || 'Unknown';
          itemRevMap[itemName] = (itemRevMap[itemName] || 0) + rev;
        });
      }

      if (alerts) {
        alerts.forEach((a: any) => {
          const dateKey = a.triggered_at?.split('T')[0];
          if (dateKey && dailyAlertMap[dateKey] !== undefined) {
            dailyAlertMap[dateKey]++;
          }
        });
      }

      let bestItem = '-';
      let maxRev = -1;
      for (const [item, rev] of Object.entries(itemRevMap)) {
        if (rev > maxRev) {
          maxRev = rev;
          bestItem = item;
        }
      }

      const revData = Object.keys(dailyRevMap).sort().map((d) => {
        const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
        const isWorkingDay = ownerWorkingDays.includes(dayName);
        return {
          value: isWorkingDay ? dailyRevMap[d] : 0,
          profit: isWorkingDay ? dailyProfMap[d] : 0,
          alerts: isWorkingDay ? dailyAlertMap[d] : 0,
          itemCount: isWorkingDay ? dailyQtyMap[d] : 0,
          label: dayName,
          fullDate: new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          frontColor: isWorkingDay ? '#F4A833' : '#E5E7EB',
          labelTextStyle: { color: isWorkingDay ? '#1E3A5F' : '#9CA3AF' },
        };
      });

      if (isComponentMounted.current) {
        setRevenueData(revData);
        setTrendData(revData);
        setSummary({
          totalRevenue: totRev,
          totalProfit: totProf,
          bestItem,
          activeAlerts: alerts ? alerts.length : 0,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isComponentMounted.current) setLoading(false);
    }
  }, []);

  // ─── focus effect ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (isActive) {
          await fetchReportData(currentWeekStart);
          dismissTooltip();
        }
      };

      loadData();

      return () => {
        isActive = false;
        // Reset chartsReady so they are deferred again on next focus
        setChartsReady(false);
      };
    }, [currentWeekStart, fetchReportData, dismissTooltip])
  );

  // ─── Defer chart mount until after navigation/layout settle ────────────────
  useEffect(() => {
    if (loading) {
      setChartsReady(false);
      return;
    }

    const handle = InteractionManager.runAfterInteractions(() => {
      if (isComponentMounted.current) {
        setChartsReady(true);
      }
    });

    return () => handle.cancel();
  }, [loading]);

  // ─── Memoised bar-chart data (avoid new array ref every render) ────────────
  const barChartData = useMemo(() => {
    return revenueData.map((item, index) => ({
      ...item,
      onPress: () => handleBarPress(index, item),
    }));
  }, [revenueData, handleBarPress]);

  const barChartMaxValue = useMemo(() => {
    return Math.max(...revenueData.map(d => d.value), 1000) * 1.2;
  }, [revenueData]);

  const lineChartMaxValue = useMemo(() => {
    return Math.max(...trendData.map(d => d.value), 1000) * 1.2;
  }, [trendData]);

  // ─── navigation helpers ────────────────────────────────────────────────────
  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    if (newDate > new Date()) return;
    setCurrentWeekStart(newDate);
  };

  const isCurrentWeek = formatDate(currentWeekStart) === formatDate(getStartOfWeek(new Date()));
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <LinearGradient
      colors={['#F0F4F8', '#F0F4F8']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('Reports')}</Text>
      </View>

      <View style={styles.weekSelector}>
        <TouchableOpacity onPress={() => changeWeek('prev')} style={styles.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#1E3A5F" />
        </TouchableOpacity>
        <Text style={styles.weekText}>
          {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
          {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeWeek('next')} style={styles.navBtn} disabled={isCurrentWeek} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={isCurrentWeek ? 'rgba(30,58,95,0.3)' : '#1E3A5F'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F4A833" />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Weekly Summary Grid */}
          <View style={styles.summaryGrid}>
            <TouchableOpacity
              style={[styles.summaryCard, expanded === 'revenue' && styles.expandedCard]}
              onPress={() => setExpanded(expanded === 'revenue' ? null : 'revenue')}
              activeOpacity={0.8}
            >
              <Text style={styles.summaryLabel}>{t('Total Revenue')}</Text>
              <AnimatedMetricValue
                targetValue={summary.totalRevenue}
                isRevenue
                hasAnimated={hasAnimatedRevenueChart}
                loading={loading}
                onAnimated={() => setHasAnimatedRevenueChart(true)}
              />
              <Ionicons
                name={expanded === 'revenue' ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#6B7280"
                style={styles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.summaryCard, expanded === 'profit' && styles.expandedCard]}
              onPress={() => setExpanded(expanded === 'profit' ? null : 'profit')}
              activeOpacity={0.8}
            >
              <Text style={styles.summaryLabel}>{t('Total Profit')}</Text>
              <AnimatedMetricValue
                targetValue={summary.totalProfit}
                hasAnimated={hasAnimatedRevenueChart}
                loading={loading}
              />
              <Ionicons
                name={expanded === 'profit' ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#6B7280"
                style={styles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.summaryCard} disabled>
              <Text style={styles.summaryLabel}>{t('Top Item')}</Text>
              <Text style={styles.summaryValueText} numberOfLines={1}>{summary.bestItem}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() => router.push('/dashboard/alerts' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.summaryLabel}>{t('Weekly Alerts')}</Text>
              <Text style={styles.summaryValue}>{summary.activeAlerts}</Text>
              <Ionicons name="chevron-forward" size={14} color="#6B7280" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* Drill-down Daily List */}
          {expanded && (
            <View style={styles.drillDownContainer}>
              <Text style={styles.drillDownTitle}>
                {expanded === 'revenue' ? t('Daily Revenue') : t('Daily Profit')}
              </Text>
              {revenueData.map((day, idx) => (
                <View key={idx} style={styles.drillDownRow}>
                  <Text style={styles.drillDownDay}>{day.label}</Text>
                  <Text style={styles.drillDownValue}>
                    {expanded === 'revenue'
                      ? `₹${day.value.toLocaleString('en-IN')}`
                      : `₹${day.profit.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Daily Revenue Bar Chart */}
          <View style={styles.chartCard} onTouchStart={dismissTooltip}>
            <Text style={styles.chartTitle}>{t('Daily Revenue')}</Text>
            {chartsReady && barChartData.length > 0 ? (
              <ChartErrorBoundary>
                <GiftedBarChart
                  data={barChartData}
                  barWidth={28}
                  spacing={25}
                  initialSpacing={20}
                  yAxisLabelWidth={50}
                  noOfSections={5}
                  maxValue={barChartMaxValue}
                  barBorderRadius={6}
                  frontColor="#F4A833"
                  yAxisThickness={0}
                  xAxisThickness={0}
                  hideRules
                  yAxisTextStyle={yAxisTextStyle}
                  xAxisLabelTextStyle={xAxisLabelTextStyle}
                />
              </ChartErrorBoundary>
            ) : (
              !loading && <ActivityIndicator size="small" color="#F4A833" style={{ paddingVertical: 40 }} />
            )}
          </View>

          {/* Sales Trend Line Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t('Sales Trend')}</Text>
            {chartsReady && trendData.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ChartErrorBoundary>
                  <GiftedLineChart
                    data={trendData}
                    color="#F4A833"
                    thickness={3}
                    dataPointsColor="#FFFFFF"
                    noOfSections={5}
                    maxValue={lineChartMaxValue}
                    hideRules
                    yAxisThickness={0}
                    xAxisThickness={0}
                    yAxisTextStyle={yAxisTextStyle}
                    xAxisLabelTextStyle={xAxisLabelTextStyle}
                    curved
                    spacing={45}
                    initialSpacing={20}
                    yAxisLabelWidth={50}
                  />
                </ChartErrorBoundary>
              </ScrollView>
            ) : (
              !loading && <ActivityIndicator size="small" color="#F4A833" style={{ paddingVertical: 40 }} />
            )}
          </View>

        </ScrollView>
      )}

      {tooltipData && (
        <Modal
          transparent
          visible={true}
          animationType="fade"
          onRequestClose={dismissTooltip}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={dismissTooltip}
            activeOpacity={1}
          >
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>
                {tooltipData.day}, {tooltipData.date}
              </Text>
              <View style={styles.tooltipDivider} />
              <Text style={styles.tooltipText}>
                Revenue: ₹{Number(tooltipData.revenue).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.tooltipText}>
                Profit: ₹{Number(tooltipData.profit).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.tooltipTextLast}>
                Items Sold: {tooltipData.itemCount}
              </Text>
              <Text style={styles.tooltipHint}>
                Tap anywhere to close
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E5E7EB'
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E3A5F' },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10
  },
  navBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB'
  },
  weekText: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative'
  },
  expandedCard: {
    borderColor: '#F4A833',
    backgroundColor: 'rgba(244, 168, 51, 0.08)'
  },
  chevron: { position: 'absolute', top: 12, right: 12 },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
  summaryValueText: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F' },
  drillDownContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  drillDownTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 15 },
  drillDownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  drillDownDay: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  drillDownValue: { fontSize: 14, color: '#1E3A5F', fontWeight: 'bold' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    zIndex: 10
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  tooltipTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 10 },
  tooltipDivider: { height: 1.5, backgroundColor: '#E5E7EB', marginBottom: 10 },
  tooltipText: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  tooltipTextLast: { fontSize: 13, color: '#4B5563' },
  tooltipHint: { fontSize: 11, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }
});