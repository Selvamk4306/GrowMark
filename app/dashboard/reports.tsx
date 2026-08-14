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
import { translateDynamic } from '@/lib/translationService';
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
  const { t, language } = useTranslation();
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
      type: 'revenue',
      day: item.label,
      date: item.fullDate,
      revenue: item.value || item.revenue || 0,
      profit: item.profit || 0,
      itemCount: item.itemCount || 0,
    });
  }, []);

  const handleTrendPress = useCallback((index: number, item: any, currentTrendData: any[]) => {
    const currentSales = Number(item.itemCount ?? item.value ?? 0);
    const currentRevenue = Number(item.revenue ?? item.value ?? 0);

    // Day-over-day growth
    let growthText = '';
    let growthType: 'up' | 'down' | 'same' | 'start' = 'start';
    if (index > 0) {
      const prevItem = currentTrendData[index - 1];
      const prevSales = Number(prevItem.itemCount ?? prevItem.value ?? 0);
      if (prevSales > 0 && currentSales > 0) {
        const pct = Math.round(((currentSales - prevSales) / prevSales) * 100);
        if (pct > 0) {
          growthText = `+${pct}% vs ${prevItem.label}`;
          growthType = 'up';
        } else if (pct < 0) {
          growthText = `${pct}% vs ${prevItem.label}`;
          growthType = 'down';
        } else {
          growthText = `No change vs ${prevItem.label}`;
          growthType = 'same';
        }
      } else if (prevSales === 0 && currentSales > 0) {
        growthText = `+${currentSales} units vs ${prevItem.label}`;
        growthType = 'up';
      } else if (prevSales > 0 && currentSales === 0) {
        growthText = `-100% vs ${prevItem.label}`;
        growthType = 'down';
      } else {
        growthText = `No sales on ${prevItem.label}`;
        growthType = 'same';
      }
    } else {
      growthText = 'Start of the week';
      growthType = 'start';
    }

    // Weekly benchmark
    const nonZeroDays = currentTrendData.filter(d => Number(d.itemCount ?? d.value ?? 0) > 0);
    const maxSales = Math.max(...currentTrendData.map(d => Number(d.itemCount ?? d.value ?? 0)), 0);
    const totalSales = currentTrendData.reduce((sum, d) => sum + Number(d.itemCount ?? d.value ?? 0), 0);
    const avgSales = nonZeroDays.length > 0 ? Math.round(totalSales / nonZeroDays.length) : 0;

    let benchmarkText = '';
    if (currentSales === 0) {
      benchmarkText = 'No sales recorded';
    } else if (currentSales === maxSales && maxSales > 0) {
      benchmarkText = '🏆 Highest of the week';
    } else if (currentSales > avgSales) {
      const diff = currentSales - avgSales;
      benchmarkText = `📈 Above weekly avg (+${diff} units)`;
    } else if (currentSales < avgSales) {
      const diff = avgSales - currentSales;
      benchmarkText = `📉 Below weekly avg (-${diff} units)`;
    } else {
      benchmarkText = '⚖️ On par with weekly avg';
    }

    const avgPrice = currentSales > 0 ? Math.round(currentRevenue / currentSales) : 0;

    setTooltipData({
      type: 'trend',
      day: item.label,
      date: item.fullDate,
      revenue: currentRevenue,
      profit: item.profit || 0,
      itemCount: currentSales,
      growthText,
      growthType,
      benchmarkText,
      avgPrice,
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
          revenue: isWorkingDay ? dailyRevMap[d] : 0,
          profit: isWorkingDay ? dailyProfMap[d] : 0,
          alerts: isWorkingDay ? dailyAlertMap[d] : 0,
          itemCount: isWorkingDay ? dailyQtyMap[d] : 0,
          label: dayName,
          fullDate: new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
          frontColor: isWorkingDay ? '#F4A833' : '#E5E7EB',
          labelTextStyle: { color: isWorkingDay ? '#1E3A5F' : '#9CA3AF' },
        };
      });

      const trendList = revData.map((d) => ({
        ...d,
        value: d.itemCount,
        revenue: d.value,
      }));

      const translatedBestItem = await translateDynamic(bestItem, language);

      if (isComponentMounted.current) {
        setRevenueData(revData);
        setTrendData(trendList);
        setSummary({
          totalRevenue: totRev,
          totalProfit: totProf,
          bestItem: translatedBestItem,
          activeAlerts: alerts ? alerts.length : 0,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isComponentMounted.current) setLoading(false);
    }
  }, [language]);

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

  const lineChartData = useMemo(() => {
    return trendData.map((item, index) => ({
      ...item,
      onPress: () => handleTrendPress(index, item, trendData),
    }));
  }, [trendData, handleTrendPress]);

  const barChartMaxValue = useMemo(() => {
    return Math.max(...revenueData.map(d => d.value), 1000) * 1.2;
  }, [revenueData]);

  const lineChartMaxValue = useMemo(() => {
    return Math.max(...trendData.map(d => Number(d.value) || 0), 10) * 1.2;
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.chartTitleNoMargin}>{t('Sales Trend')}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{t('Tap dot for details')}</Text>
            </View>
            {chartsReady && trendData.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ChartErrorBoundary>
                  <GiftedLineChart
                    data={lineChartData}
                    color="#1E3A5F"
                    thickness={3}
                    dataPointsColor="#F4A833"
                    dataPointsRadius={6}
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
              <View style={styles.tooltipHeaderRow}>
                <View style={[styles.tooltipBadge, tooltipData.type === 'trend' ? styles.tooltipBadgeTrend : styles.tooltipBadgeRev]}>
                  <Text style={[styles.tooltipBadgeText, tooltipData.type === 'trend' ? styles.tooltipBadgeTextTrend : styles.tooltipBadgeTextRev]}>
                    {tooltipData.type === 'trend' ? t('Sales Trend') : t('Daily Revenue')}
                  </Text>
                </View>
                <Text style={styles.tooltipTitle}>
                  {tooltipData.day}, {tooltipData.date}
                </Text>
              </View>

              <View style={styles.tooltipDivider} />

              {tooltipData.type === 'trend' ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.tooltipHighlightBox}>
                    <Text style={styles.tooltipHighlightLabel}>{t('Units Sold')}</Text>
                    <Text style={styles.tooltipHighlightVal}>
                      {tooltipData.itemCount} <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 'normal' }}>{t('units')}</Text>
                    </Text>
                  </View>

                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Day-over-Day')}</Text>
                    <Text style={[
                      styles.tooltipRowVal,
                      tooltipData.growthType === 'up' ? { color: '#059669' } :
                      tooltipData.growthType === 'down' ? { color: '#DC2626' } : { color: '#4B5563' }
                    ]}>
                      {tooltipData.growthText}
                    </Text>
                  </View>

                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Week Benchmark')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#1E3A5F', fontSize: 12, flexShrink: 1, textAlign: 'right' }]}>
                      {tooltipData.benchmarkText}
                    </Text>
                  </View>

                  <View style={[styles.tooltipDivider, { marginVertical: 4 }]} />

                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Total Revenue')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#1E3A5F' }]}>
                      ₹{Number(tooltipData.revenue).toLocaleString('en-IN')}
                      {tooltipData.avgPrice > 0 ? ` (~₹${tooltipData.avgPrice}/unit)` : ''}
                    </Text>
                  </View>

                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Total Profit')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#059669' }]}>
                      ₹{Number(tooltipData.profit).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Revenue')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#1E3A5F' }]}>
                      ₹{Number(tooltipData.revenue).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Profit')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#059669' }]}>
                      ₹{Number(tooltipData.profit).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <Text style={styles.tooltipRowLabel}>{t('Items Sold')}</Text>
                    <Text style={[styles.tooltipRowVal, { color: '#1E3A5F' }]}>
                      {tooltipData.itemCount} {t('units')}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.tooltipHint}>
                {t('Tap anywhere to close')}
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
  chartTitleNoMargin: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minWidth: 260,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12
  },
  tooltipHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  tooltipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tooltipBadgeTrend: {
    backgroundColor: '#FEF3C7',
  },
  tooltipBadgeRev: {
    backgroundColor: '#DBEAFE',
  },
  tooltipBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tooltipBadgeTextTrend: {
    color: '#92400E',
  },
  tooltipBadgeTextRev: {
    color: '#1E40AF',
  },
  tooltipTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F' },
  tooltipDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  tooltipHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 58, 95, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.1)',
  },
  tooltipHighlightLabel: { fontSize: 13, fontWeight: '600', color: '#1E3A5F' },
  tooltipHighlightVal: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tooltipRowLabel: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  tooltipRowVal: { fontSize: 13, fontWeight: 'bold' },
  tooltipHint: { fontSize: 11, color: '#9CA3AF', marginTop: 14, textAlign: 'center' }
});