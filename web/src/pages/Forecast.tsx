/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useForecast } from '../hooks/useForecast';
import { formatCurrency } from '../lib/businessLogic';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Package,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Moon,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export function Forecast() {
  const { owner } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');

  const {
    forecasts,
    loading,
    retraining,
    error,
    lastUpdated,
    refresh,
    retrain,
  } = useForecast(owner?.id);

  const displayedForecasts = useMemo(() => {
    if (selectedItemId === 'ALL') return forecasts;
    return forecasts.filter((f) => f.item_id === selectedItemId);
  }, [forecasts, selectedItemId]);

  const totalPredictedRevenue = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + (f.weekly_summary?.total_predicted_revenue || 0), 0);
  }, [forecasts]);

  const totalPredictedUnits = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + (f.weekly_summary?.total_predicted_quantity || 0), 0);
  }, [forecasts]);

  const totalTargetRate = useMemo(() => {
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

  const getConfidenceBadge = (confidence: string) => {
    const lower = confidence?.toLowerCase() || '';
    if (lower.includes('high')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          {confidence} {t('Confidence')}
        </span>
      );
    }
    if (lower.includes('medium')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          {confidence} {t('Confidence')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
        {confidence} {t('Confidence')}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A5F]">
                {t('Sales Forecasting AI')}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                <Sparkles className="w-3 h-3 mr-1" />
                ML Model
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {lastUpdated
                ? `${t('Updated')}: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : t('Next 7 days sales predictions trained on historical data')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="p-2.5 border border-border hover:bg-gray-50 rounded-xl transition-colors text-gray-600 cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={retrain}
            disabled={retraining || loading}
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#152942] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? t('Retraining Models...') : t('Retrain Models')}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refresh()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            {t('Retry')}
          </button>
        </div>
      )}

      {/* Top Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2D5A8E] text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-80 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('Predicted Weekly Revenue')}</span>
            <TrendingUp className="w-5 h-5 text-[#F4A833]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold">
            {formatCurrency(totalPredictedRevenue)}
          </div>
          <p className="text-xs text-blue-200/80 mt-1">
            {forecasts.length} {t('Items tracked with ML')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('Predicted Units')}</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {totalPredictedUnits} <span className="text-sm font-normal text-gray-500">{t('units')}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('Total predicted demand next week')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('Target Achievement')}</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {totalTargetRate}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('Daily targets forecast to be met')}
          </p>
        </div>
      </div>

      {/* Item Filter Pills */}
      {forecasts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedItemId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedItemId === 'ALL'
                ? 'bg-[#1E3A5F] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-border hover:bg-gray-50'
            }`}
          >
            {t('All Items')} ({forecasts.length})
          </button>
          {forecasts.map((f) => (
            <button
              key={f.item_id}
              onClick={() => setSelectedItemId(f.item_id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedItemId === f.item_id
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-border hover:bg-gray-50'
              }`}
            >
              {f.item_name}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && forecasts.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <RefreshCw className="w-8 h-8 text-[#1E3A5F] animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{t('Generating Sales Forecasts with AI...')}</p>
        </div>
      )}

      {/* Forecast Cards */}
      <div className="space-y-6">
        {displayedForecasts.map((item) => {
          // Prepare chart data for recharts
          const chartData = (item.predictions || []).map((p) => ({
            name: `${p.day.slice(0, 3)} (${p.date.slice(5)})`,
            predicted: p.predicted_quantity,
            target: p.min_daily_target,
            revenue: p.predicted_revenue,
          }));

          return (
            <div
              key={item.item_id}
              className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-6"
            >
              {/* Item Card Top */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900">{item.item_name}</h2>
                    {getConfidenceBadge(item.confidence)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{t('Model')}: <strong className="text-gray-700">{item.model_type}</strong></span>
                    {item.mae !== undefined && item.mae !== null && (
                      <>
                        <span>•</span>
                        <span>MAE: <strong className="text-gray-700">{item.mae}</strong></span>
                      </>
                    )}
                    {item.selling_price ? (
                      <>
                        <span>•</span>
                        <span>Price: <strong className="text-gray-700">{formatCurrency(item.selling_price)}</strong></span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Weekly summary chips */}
                <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl border border-border/80 text-xs">
                  <div>
                    <span className="text-gray-400 block">{t('Week Qty')}</span>
                    <strong className="text-gray-800 text-sm">{item.weekly_summary?.total_predicted_quantity || 0}</strong>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div>
                    <span className="text-gray-400 block">{t('Week Rev')}</span>
                    <strong className="text-[#1E3A5F] text-sm">{formatCurrency(item.weekly_summary?.total_predicted_revenue || 0)}</strong>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div>
                    <span className="text-gray-400 block">{t('Target')}</span>
                    <strong className={item.weekly_summary?.meets_weekly_target ? 'text-emerald-600 text-sm' : 'text-amber-600 text-sm'}>
                      {item.weekly_summary?.min_weekly_target || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `${value} units`,
                        name === 'predicted' ? 'Predicted Qty' : 'Daily Min Target',
                      ]}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#E5E7EB' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="predicted" name="Predicted Demand" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Min Target" fill="#F4A833" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3">{t('Date & Day')}</th>
                      <th className="pb-3 text-center">{t('Predicted Quantity')}</th>
                      <th className="pb-3 text-center">{t('Daily Target')}</th>
                      <th className="pb-3 text-right">{t('Predicted Revenue')}</th>
                      <th className="pb-3 text-right">{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {item.predictions?.map((pred, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 font-medium text-gray-900">
                          {pred.day}, <span className="text-gray-500 text-xs">{pred.date}</span>
                        </td>
                        <td className="py-3 text-center font-bold text-[#1E3A5F]">
                          {pred.is_leave ? '0' : pred.predicted_quantity} {t('units')}
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {pred.min_daily_target} {t('units')}
                        </td>
                        <td className="py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(pred.predicted_revenue)}
                        </td>
                        <td className="py-3 text-right">
                          {pred.is_leave ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              <Moon className="w-3 h-3 mr-1" />
                              {t('Shop Closed')}
                            </span>
                          ) : pred.meets_target ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('Target Met')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {t('Below Target')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && forecasts.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">{t('No Forecast Data Available')}</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {t('Ensure you have items added and at least 14 days of sales recorded to generate machine learning forecasts.')}
          </p>
          <button
            onClick={retrain}
            className="mt-4 inline-flex items-center gap-2 bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#152942] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {t('Train ML Models Now')}
          </button>
        </div>
      )}
    </div>
  );
}
