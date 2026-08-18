import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useForecast, ItemForecast, DailyPrediction } from '../../hooks/useForecast';

const { width } = Dimensions.get('window');

export default function ForecastScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  useEffect(() => {
    async function loadOwner() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: owner } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        if (owner) setOwnerId(owner.id);
      } catch (e) {
        console.error('Error fetching owner in forecast screen:', e);
      }
    }
    loadOwner();
  }, []);

  const {
    forecasts,
    loading,
    retraining,
    error,
    lastUpdated,
    refresh,
    retrain,
  } = useForecast(ownerId || undefined);

  // Filtered item or all items
  const displayedForecasts = useMemo(() => {
    if (selectedItemId === 'ALL') return forecasts;
    return forecasts.filter((f) => f.item_id === selectedItemId);
  }, [forecasts, selectedItemId]);

  // Aggregate weekly overview metrics
  const totalPredictedRevenue = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + (f.weekly_summary?.total_predicted_revenue || 0), 0);
  }, [forecasts]);

  const totalPredictedUnits = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + (f.weekly_summary?.total_predicted_quantity || 0), 0);
  }, [forecasts]);

  const totalDaysMeetingTarget = useMemo(() => {
    let met = 0;
    let total = 0;
    forecasts.forEach((f) => {
      f.predictions?.forEach((p) => {
        total += 1;
        if (p.meets_target) met += 1;
      });
    });
    return total > 0 ? Math.round((met / total) * 100) : 0;
  }, [forecasts]);

  const getConfidenceColor = (confidence: string) => {
    const lower = confidence?.toLowerCase() || '';
    if (lower.includes('high')) return '#10B981'; // Green
    if (lower.includes('medium')) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('Sales Forecasting')}</Text>
          <Text style={styles.headerSubtitle}>
            {lastUpdated
              ? `${t('Updated')}: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : t('Next 7 Days ML Predictions')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={retrain}
          disabled={retraining || loading}
          style={[styles.retrainBtn, retraining && styles.retrainBtnDisabled]}
        >
          {retraining ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.retrainBtnContent}>
              <Ionicons name="sync" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.retrainBtnText}>{t('Retrain')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Error Notification */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t('Retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Aggregate Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, styles.revenueCard]}>
            <View style={styles.overviewIconContainer}>
              <Ionicons name="trending-up" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.overviewLabel}>{t('Predicted Weekly Revenue')}</Text>
            <Text style={styles.overviewValue}>₹{totalPredictedRevenue.toLocaleString()}</Text>
            <Text style={styles.overviewSub}>
              {forecasts.length} {t('Items tracked')}
            </Text>
          </View>

          <View style={styles.overviewRow}>
            <View style={[styles.overviewCardSmall, { marginRight: 8 }]}>
              <View style={styles.overviewIconContainerSmall}>
                <Ionicons name="cube-outline" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.overviewLabelSmall}>{t('Total Units')}</Text>
              <Text style={styles.overviewValueSmall}>{totalPredictedUnits}</Text>
            </View>

            <View style={[styles.overviewCardSmall, { marginLeft: 8 }]}>
              <View style={styles.overviewIconContainerSmall}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
              </View>
              <Text style={styles.overviewLabelSmall}>{t('Target Pace')}</Text>
              <Text style={styles.overviewValueSmall}>{totalDaysMeetingTarget}%</Text>
            </View>
          </View>
        </View>

        {/* Item Selector Pills */}
        {forecasts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedItemId('ALL')}
              style={[
                styles.itemPill,
                selectedItemId === 'ALL' && styles.itemPillActive,
              ]}
            >
              <Text
                style={[
                  styles.itemPillText,
                  selectedItemId === 'ALL' && styles.itemPillTextActive,
                ]}
              >
                {t('All Items')} ({forecasts.length})
              </Text>
            </TouchableOpacity>

            {forecasts.map((f) => (
              <TouchableOpacity
                key={f.item_id}
                onPress={() => setSelectedItemId(f.item_id)}
                style={[
                  styles.itemPill,
                  selectedItemId === f.item_id && styles.itemPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.itemPillText,
                    selectedItemId === f.item_id && styles.itemPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {f.item_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Loading State */}
        {loading && forecasts.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('Generating Sales Forecasts with AI...')}</Text>
          </View>
        )}

        {/* Forecast Items List */}
        {displayedForecasts.map((item) => (
          <View key={item.item_id} style={styles.itemForecastCard}>
            {/* Item Card Header */}
            <View style={styles.itemCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.item_name}</Text>
                <Text style={styles.itemModelInfo}>
                  {t('Model')}: {item.model_type || 'RandomForest'}
                  {item.mae !== undefined && item.mae !== null ? ` • MAE: ${item.mae}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: `${getConfidenceColor(item.confidence)}20` },
                ]}
              >
                <View
                  style={[
                    styles.confidenceDot,
                    { backgroundColor: getConfidenceColor(item.confidence) },
                  ]}
                />
                <Text
                  style={[
                    styles.confidenceText,
                    { color: getConfidenceColor(item.confidence) },
                  ]}
                >
                  {item.confidence} {t('Confidence')}
                </Text>
              </View>
            </View>

            {/* Item Weekly Summary Banner */}
            <View style={styles.itemWeeklyBanner}>
              <View style={styles.bannerItem}>
                <Text style={styles.bannerLabel}>{t('Predicted Units')}</Text>
                <Text style={styles.bannerValue}>
                  {item.weekly_summary?.total_predicted_quantity || 0}
                </Text>
              </View>
              <View style={styles.bannerDivider} />
              <View style={styles.bannerItem}>
                <Text style={styles.bannerLabel}>{t('Predicted Rev')}</Text>
                <Text style={styles.bannerValue}>
                  ₹{(item.weekly_summary?.total_predicted_revenue || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.bannerDivider} />
              <View style={styles.bannerItem}>
                <Text style={styles.bannerLabel}>{t('Weekly Target')}</Text>
                <Text
                  style={[
                    styles.bannerValue,
                    {
                      color: item.weekly_summary?.meets_weekly_target
                        ? Colors.success
                        : Colors.warning,
                    },
                  ]}
                >
                  {item.weekly_summary?.min_weekly_target || 0}
                </Text>
              </View>
            </View>

            {/* Daily Predictions Breakdown */}
            <Text style={styles.breakdownTitle}>{t('7-Day Daily Breakdown')}</Text>
            <View style={styles.dailyList}>
              {item.predictions?.map((pred, idx) => {
                const maxVal = Math.max(pred.predicted_quantity, pred.min_daily_target, 1);
                const predWidthPct = Math.min(100, Math.round((pred.predicted_quantity / maxVal) * 100));
                const targetWidthPct = Math.min(100, Math.round((pred.min_daily_target / maxVal) * 100));

                return (
                  <View key={`${pred.date}-${idx}`} style={styles.dailyRow}>
                    <View style={styles.dailyDayCol}>
                      <Text style={styles.dailyDayName}>{pred.day.slice(0, 3)}</Text>
                      <Text style={styles.dailyDate}>{pred.date.slice(5)}</Text>
                    </View>

                    {/* Progress Bar comparison */}
                    <View style={styles.dailyBarCol}>
                      {pred.is_leave ? (
                        <View style={styles.leaveBadge}>
                          <Ionicons name="moon-outline" size={14} color="#6B7280" />
                          <Text style={styles.leaveText}>{t('Shop Closed')}</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${predWidthPct}%`,
                                  backgroundColor: pred.meets_target ? Colors.success : Colors.warning,
                                },
                              ]}
                            />
                            {pred.min_daily_target > 0 && (
                              <View
                                style={[
                                  styles.targetMarker,
                                  { left: `${Math.min(95, targetWidthPct)}%` },
                                ]}
                              />
                            )}
                          </View>
                          <View style={styles.barLabelRow}>
                            <Text style={styles.barQtyText}>
                              {pred.predicted_quantity} {t('units')}
                            </Text>
                            <Text style={styles.barTargetText}>
                              {t('Target')}: {pred.min_daily_target}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Revenue & Status Badge */}
                    <View style={styles.dailyStatusCol}>
                      <Text style={styles.dailyRevText}>₹{pred.predicted_revenue}</Text>
                      {pred.is_leave ? (
                        <Text style={styles.statusLeaveText}>—</Text>
                      ) : pred.meets_target ? (
                        <View style={styles.statusMet}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                          <Text style={styles.statusMetText}>{t('Target Met')}</Text>
                        </View>
                      ) : (
                        <View style={styles.statusBelow}>
                          <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                          <Text style={styles.statusBelowText}>{t('Below Target')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Empty state */}
        {!loading && displayedForecasts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t('No Forecast Data Yet')}</Text>
            <Text style={styles.emptySub}>
              {t('Add items and record daily sales to start predicting future demand.')}
            </Text>
            <TouchableOpacity onPress={retrain} style={styles.emptyActionBtn}>
              <Text style={styles.emptyActionBtnText}>{t('Train ML Models Now')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  retrainBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retrainBtnDisabled: {
    opacity: 0.6,
  },
  retrainBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retrainBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    marginLeft: 8,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  overviewContainer: {
    marginBottom: 16,
  },
  overviewCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  revenueCard: {
    backgroundColor: '#1E3A5F',
  },
  overviewIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  overviewValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  overviewSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  overviewRow: {
    flexDirection: 'row',
  },
  overviewCardSmall: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewIconContainerSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  overviewLabelSmall: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  overviewValueSmall: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  pillScroll: {
    paddingBottom: 12,
  },
  itemPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemPillText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  itemForecastCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  itemModelInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemWeeklyBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  bannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  bannerDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
  },
  bannerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  bannerValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  dailyList: {},
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dailyDayCol: {
    width: 44,
  },
  dailyDayName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dailyDate: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  dailyBarCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  leaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  leaveText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.primary,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  barQtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  barTargetText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  dailyStatusCol: {
    alignItems: 'flex-end',
    width: 80,
  },
  dailyRevText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusMet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusMetText: {
    fontSize: 10,
    color: Colors.success,
    marginLeft: 2,
    fontWeight: '500',
  },
  statusBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBelowText: {
    fontSize: 10,
    color: Colors.warning,
    marginLeft: 2,
    fontWeight: '500',
  },
  statusLeaveText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
  emptyActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
