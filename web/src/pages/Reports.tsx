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

  const handleChartClick = (data: any) => {
    if (!data) return;
    if (data.payload) {
      setSelectedDayData(data.payload);
    } else if (data.activePayload && data.activePayload.length > 0) {
      setSelectedDayData(data.activePayload[0].payload);
    } else if (data.date || data.day) {
      setSelectedDayData(data);
    }
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
              <div className="mt-3 text-lg sm:text-2xl font-black text-primary">
                {formatCurrency(summary.totalProfit)}
              </div>
            </div>

            {/* 3. TOP ITEM CARD */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Top Item')}</span>
              <div className="mt-3 text-base sm:text-xl font-bold text-primary truncate" title={summary.bestItem}>
                {summary.bestItem}
              </div>
            </div>

            {/* 4. WEEKLY ALERTS CARD */}
            <div
              onClick={() => navigate('/alerts')}
              className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between cursor-pointer hover-lift"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Weekly Alerts')}</span>
                <ChevronRight className="w-4 h-4 text-textSecondary" />
              </div>
              <div className="mt-3 text-lg sm:text-2xl font-black text-danger">
                {summary.activeAlerts}
              </div>
            </div>

          </div>

          {/* ACCORDION SLIDE-DOWN DRILL-DOWN CONTAINER */}
          {expanded && (
            <div className="bg-white border border-border rounded-2xl p-5 shadow-md space-y-3 animate-fadeIn">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">
                {expanded === 'revenue' ? t('Daily Revenue Breakdown') : t('Daily Profit Breakdown')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2 pt-1">
                {reportData.map((day, idx) => (
                  <div key={idx} className="bg-background rounded-xl p-3 border border-border flex flex-col justify-between text-center">
                    <span className="text-xs font-bold text-textSecondary">{day.day}</span>
                    <span className="text-sm font-extrabold text-primary mt-1">
                      {expanded === 'revenue'
                        ? formatCurrency(day.revenue)
                        : formatCurrency(day.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVENUE BY DATE CHART */}
          <div className="glass p-6 rounded-2xl bg-white border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-primary">{t('Daily Revenue')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={reportData}
                  onClick={handleChartClick}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                  <YAxis domain={[0, revenueMax]} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `₹${val}`} />
                  <Bar 
                    dataKey="revenue" 
                    fill="#F4A833" 
                    radius={[4, 4, 0, 0]} 
                    onClick={handleChartClick}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SALES TREND CHART */}
          <div className="glass p-6 rounded-2xl bg-white border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-primary">{t('Sales Trend')}</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={reportData}
                  onClick={handleChartClick}
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
                    dot={{ fill: '#1E3A5F', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }} 
                    onClick={handleChartClick}
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
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-primary">
                {selectedDayData.formattedDate || selectedDayData.date || selectedDayData.day}
              </h3>
              <button 
                onClick={() => setSelectedDayData(null)}
                className="p-1 rounded-lg text-textSecondary hover:bg-background cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-textPrimary">Revenue</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(selectedDayData.revenue || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-textPrimary">Profit</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(selectedDayData.profit || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-textPrimary">Items Sold</span>
                <span className="text-base font-bold text-primary">
                  {selectedDayData.sales || selectedDayData.itemCount || 0}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border text-center">
              <p className="text-xs text-textSecondary">Tap anywhere outside to close</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
