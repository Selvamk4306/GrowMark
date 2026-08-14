/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { formatDate, getStartOfWeek, formatCurrency } from '../lib/businessLogic';
import { useTranslation } from '../hooks/useTranslation';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export function Reports() {
  const { owner } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalProfit: 0, bestItem: '-', activeAlerts: 0 });
  const [expanded, setExpanded] = useState<'revenue' | 'profit' | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<any | null>(null);

  const revenueMax = useMemo(() => {
    const maxVal = Math.max(...reportData.map(d => Number(d.revenue) || 0), 1000);
    return Math.ceil((maxVal * 1.2) / 100) * 100;
  }, [reportData]);

  const salesMax = useMemo(() => {
    const maxVal = Math.max(...reportData.map(d => Number(d.sales) || 0), 10);
    return Math.ceil((maxVal * 1.2) / 5) * 5;
  }, [reportData]);

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7));
    if (newDate > new Date()) return;
    setCurrentWeekStart(newDate);
  };

  const isCurrentWeek = formatDate(currentWeekStart) === formatDate(getStartOfWeek(new Date()));
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => {
    if (!owner) return;

    async function loadReports() {
      setLoading(true);
      try {
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(currentWeekStart);
          d.setDate(d.getDate() + i);
          return d;
        });

        const startDay = formatDate(weekDays[0]);
        const endDay = formatDate(weekDays[6]);

        const { data: sales } = await supabase
          .from('daily_sales')
          .select('sale_date, total_revenue, total_profit, quantity_sold, items(item_name, cost_price)')
          .eq('owner_id', owner.id)
          .gte('sale_date', startDay)
          .lte('sale_date', endDay);

        const { data: alerts } = await supabase
          .from('alerts')
          .select('id, triggered_at')
          .eq('owner_id', owner.id)
          .gte('triggered_at', startDay)
          .lte('triggered_at', endDay + 'T23:59:59');

        let totRev = 0;
        let totProf = 0;
        const itemRevMap: Record<string, number> = {};

        const chartMap = new Map();
        weekDays.forEach(d => {
          const dateStr = formatDate(d);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          const formattedHeader = d.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
          chartMap.set(dateStr, { 
            date: dateStr, 
            day: dayName, 
            formattedDate: formattedHeader,
            revenue: 0, 
            sales: 0, 
            profit: 0 
          });
        });

        if (sales) {
          sales.forEach((sale: any) => {
            const r = Number(sale.total_revenue || 0);
            const qty = Number(sale.quantity_sold || 0);
            const item = Array.isArray(sale.items) ? sale.items[0] : sale.items;

            let finalProf = 0;
            if (sale.total_profit !== null && sale.total_profit !== undefined && Number(sale.total_profit) !== 0) {
              finalProf = Number(sale.total_profit);
            } else if (item) {
              finalProf = r - (Number(item.cost_price || 0) * qty);
            }

            totRev += r;
            totProf += finalProf;

            if (chartMap.has(sale.sale_date)) {
              const current = chartMap.get(sale.sale_date);
              current.revenue += r;
              current.sales += qty;
              current.profit += finalProf;
            }

            const itemName = item?.item_name || 'Unknown';
            itemRevMap[itemName] = (itemRevMap[itemName] || 0) + r;
          });
        }

        let bestItem = '-';
        let maxRev = -1;
        for (const [itemName, rev] of Object.entries(itemRevMap)) {
          if (rev > maxRev) {
            maxRev = rev;
            bestItem = itemName;
          }
        }

        setSummary({
          totalRevenue: totRev,
          totalProfit: totProf,
          bestItem,
          activeAlerts: alerts ? alerts.length : 0,
        });

        setReportData(Array.from(chartMap.values()));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [owner, currentWeekStart]);

  const getTrendInsights = (item: any, list: any[]) => {
    if (!item || !list || list.length === 0) return null;
    const index = list.findIndex(d => d.date === item.date || d.day === item.day);
    const currentSales = Number(item.sales || item.itemCount || 0);
    const currentRevenue = Number(item.revenue || 0);

    // Day-over-day growth
    let growthText = '';
    let growthType: 'up' | 'down' | 'same' | 'start' = 'start';
    if (index > 0) {
      const prevItem = list[index - 1];
      const prevSales = Number(prevItem.sales || prevItem.itemCount || 0);
      if (prevSales > 0 && currentSales > 0) {
        const pct = Math.round(((currentSales - prevSales) / prevSales) * 100);
        if (pct > 0) {
          growthText = `+${pct}% vs ${prevItem.day}`;
          growthType = 'up';
        } else if (pct < 0) {
          growthText = `${pct}% vs ${prevItem.day}`;
          growthType = 'down';
        } else {
          growthText = `No change vs ${prevItem.day}`;
          growthType = 'same';
        }
      } else if (prevSales === 0 && currentSales > 0) {
        growthText = `+${currentSales} units vs ${prevItem.day}`;
        growthType = 'up';
      } else if (prevSales > 0 && currentSales === 0) {
        growthText = `-100% vs ${prevItem.day}`;
        growthType = 'down';
      } else {
        growthText = `No sales on ${prevItem.day}`;
        growthType = 'same';
      }
    } else {
      growthText = 'Start of the week';
      growthType = 'start';
    }

    // Weekly benchmark
    const nonZeroDays = list.filter(d => Number(d.sales || d.itemCount || 0) > 0);
    const maxSales = Math.max(...list.map(d => Number(d.sales || d.itemCount || 0)), 0);
    const totalSales = list.reduce((sum, d) => sum + Number(d.sales || d.itemCount || 0), 0);
    const avgSales = nonZeroDays.length > 0 ? Math.round(totalSales / nonZeroDays.length) : 0;

    let benchmarkText = '';
    if (currentSales === 0) {
      benchmarkText = 'No sales recorded';
    } else if (currentSales === maxSales && maxSales > 0) {
      benchmarkText = '🏆 Highest sales day this week';
    } else if (currentSales > avgSales) {
      const diff = currentSales - avgSales;
      benchmarkText = `📈 Above weekly avg (+${diff} units)`;
    } else if (currentSales < avgSales) {
      const diff = avgSales - currentSales;
      benchmarkText = `📉 Below weekly avg (-${diff} units)`;
    } else {
      benchmarkText = '⚖️ On par with weekly average';
    }

    const avgPricePerUnit = currentSales > 0 ? Math.round(currentRevenue / currentSales) : 0;

    return {
      growthText,
      growthType,
      benchmarkText,
      avgPricePerUnit,
    };
  };

  const handleBarClick = (data: any) => {
    const payload = data?.payload || data?.activePayload?.[0]?.payload || (data?.date || data?.day ? data : null);
    if (!payload) return;
    setSelectedDayData({ ...payload, chartType: 'revenue' });
  };

  const handleTrendClick = (data: any) => {
    const payload = data?.payload || data?.activePayload?.[0]?.payload || (data?.date || data?.day ? data : null);
    if (!payload) return;
    const insights = getTrendInsights(payload, reportData);
    setSelectedDayData({ ...payload, ...insights, chartType: 'trend' });
  };

  return (
    <div className="w-full space-y-6 relative">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t('Reports')}</h1>

      {/* WEEK SELECTOR BAR */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <button
          onClick={() => changeWeek('prev')}
          className="p-2 rounded-xl border border-border text-primary hover:bg-background transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-base font-bold text-primary tracking-wide">
          {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
          {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>

        <button
          onClick={() => changeWeek('next')}
          disabled={isCurrentWeek}
          className={`p-2 rounded-xl border border-border transition-colors ${
            isCurrentWeek
              ? 'opacity-30 cursor-not-allowed text-textSecondary'
              : 'text-primary hover:bg-background cursor-pointer'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-textSecondary">{t('Calculating...')}</div>
      ) : (
        <div className="space-y-6">

          {/* 4 SUMMARY CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* 1. TOTAL REVENUE CARD */}
            <div
              onClick={() => setExpanded(expanded === 'revenue' ? null : 'revenue')}
              className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between cursor-pointer hover-lift transition-all ${
                expanded === 'revenue' ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Total Revenue')}</span>
                {expanded === 'revenue' ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
              </div>
              <div className="mt-3 text-lg sm:text-2xl font-black text-primary">
                {formatCurrency(summary.totalRevenue)}
              </div>
            </div>

            {/* 2. TOTAL PROFIT CARD */}
            <div
              onClick={() => setExpanded(expanded === 'profit' ? null : 'profit')}
              className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between cursor-pointer hover-lift transition-all ${
                expanded === 'profit' ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Total Profit')}</span>
                {expanded === 'profit' ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
              </div>
              <div className="mt-3 text-lg sm:text-2xl font-black text-emerald-600">
                {formatCurrency(summary.totalProfit)}
              </div>
            </div>

            {/* 3. TOP ITEM CARD */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Top Item')}</span>
              <div className="mt-3 text-lg sm:text-xl font-bold text-primary truncate" title={summary.bestItem}>
                {summary.bestItem}
              </div>
            </div>

            {/* 4. WEEKLY ALERTS CARD */}
            <div
              onClick={() => navigate('/alerts')}
              className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between cursor-pointer hover-lift transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Weekly Alerts')}</span>
                <ChevronRight className="w-4 h-4 text-textSecondary" />
              </div>
              <div className="mt-3 text-lg sm:text-2xl font-black text-rose-500">
                {summary.activeAlerts}
              </div>
            </div>

          </div>

          {/* DRILL-DOWN DAILY LIST (EXPANDABLE) */}
          {expanded && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-primary">
                {expanded === 'revenue' ? t('Daily Revenue Breakdown') : t('Daily Profit Breakdown')}
              </h3>
              <div className="divide-y divide-border">
                {reportData.map((d) => (
                  <div key={d.date} className="py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-textPrimary">{d.formattedDate}</span>
                    <span className={`text-sm font-bold ${expanded === 'profit' ? 'text-emerald-600' : 'text-primary'}`}>
                      {formatCurrency(expanded === 'revenue' ? d.revenue : d.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAILY REVENUE BAR CHART */}
          <div className="glass p-6 rounded-2xl bg-white border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">{t('Daily Revenue')}</h3>
              <span className="text-xs text-textSecondary font-medium">{t('Click any bar for details')}</span>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={reportData}
                  onClick={handleBarClick}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis domain={[0, revenueMax]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `₹${val}`} />
                  <Bar 
                    dataKey="revenue" 
                    fill="#F4A833" 
                    radius={[4, 4, 0, 0]} 
                    onClick={handleBarClick}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SALES TREND CHART */}
          <div className="glass p-6 rounded-2xl bg-white border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">{t('Sales Trend')}</h3>
              <span className="text-xs text-textSecondary font-medium">{t('Click any dot for trend details')}</span>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={reportData}
                  onClick={handleTrendClick}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis domain={[0, salesMax]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    name={t("Quantity Sold")} 
                    stroke="#1E3A5F" 
                    strokeWidth={3} 
                    dot={{ fill: '#1E3A5F', strokeWidth: 2, r: 5, cursor: 'pointer', onClick: (_e: any, payload: any) => handleTrendClick(payload) }} 
                    activeDot={{ r: 7, stroke: '#F4A833', strokeWidth: 2, cursor: 'pointer', onClick: (_e: any, payload: any) => handleTrendClick(payload) }} 
                    onClick={handleTrendClick}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* CLICK DETAILS POPUP MODAL */}
      {selectedDayData && (
        <div 
          onClick={() => setSelectedDayData(null)}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-border animate-in fade-in zoom-in duration-150"
          >
            {selectedDayData.chartType === 'trend' ? (
              <>
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono mb-1 inline-block">
                      {t('Sales Trend')}
                    </span>
                    <h3 className="text-lg font-bold text-primary">
                      {selectedDayData.formattedDate || selectedDayData.date || selectedDayData.day}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedDayData(null)}
                    className="p-1 rounded-lg text-textSecondary hover:bg-background cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Primary metric: Units Sold */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="text-sm font-semibold text-textPrimary">{t('Units Sold')}</span>
                    <span className="text-xl font-extrabold text-primary">
                      {selectedDayData.sales || selectedDayData.itemCount || 0}{' '}
                      <span className="text-xs font-medium text-textSecondary">{t('units')}</span>
                    </span>
                  </div>

                  {/* Day-over-Day Growth */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-textPrimary">{t('Day-over-Day')}</span>
                    <span className={`font-bold ${
                      selectedDayData.growthType === 'up' ? 'text-emerald-600' :
                      selectedDayData.growthType === 'down' ? 'text-rose-600' : 'text-textSecondary'
                    }`}>
                      {selectedDayData.growthText}
                    </span>
                  </div>

                  {/* Weekly Benchmark */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-textPrimary">{t('Week Benchmark')}</span>
                    <span className="font-bold text-primary text-right text-xs sm:text-sm">
                      {selectedDayData.benchmarkText}
                    </span>
                  </div>

                  {/* Financial context */}
                  <div className="pt-2 border-t border-border/60 flex justify-between items-center text-sm">
                    <span className="text-textSecondary">{t('Total Revenue')}</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(selectedDayData.revenue || 0)}
                      {selectedDayData.avgPricePerUnit > 0 && (
                        <span className="text-xs text-textSecondary ml-1 font-normal">
                          (~₹{selectedDayData.avgPricePerUnit}/unit)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-textSecondary">{t('Total Profit')}</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(selectedDayData.profit || 0)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono mb-1 inline-block">
                      {t('Daily Revenue')}
                    </span>
                    <h3 className="text-lg font-bold text-primary">
                      {selectedDayData.formattedDate || selectedDayData.date || selectedDayData.day}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedDayData(null)}
                    className="p-1 rounded-lg text-textSecondary hover:bg-background cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-textPrimary">{t('Revenue')}</span>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(selectedDayData.revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-textPrimary">{t('Profit')}</span>
                    <span className="text-base font-bold text-emerald-600">
                      {formatCurrency(selectedDayData.profit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-textPrimary">{t('Items Sold')}</span>
                    <span className="text-base font-bold text-primary">
                      {selectedDayData.sales || selectedDayData.itemCount || 0} {t('units')}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-border text-center">
              <p className="text-xs text-textSecondary">{t('Tap anywhere outside to close')}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
