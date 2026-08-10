/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { translateDynamic } from '../lib/translationService';
import { MetricCard } from '../components/MetricCard';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { AlertCard } from '../components/AlertCard';
import { formatCurrency, formatDate, getStartOfWeek } from '../lib/businessLogic';
import { 
  IndianRupee, 
  TrendingUp, 
  CheckCircle, 
  BellRing, 
  Umbrella, 
  Store, 
  Package, 
  Lightbulb, 
  ArrowRight, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const INSIGHT_VARIATIONS: Record<string, Array<{ title: string; desc: string }>> = {
  'Revenue Drop': [
    { title: 'Revenue Slip', desc: 'Your weekly revenue dropped. Consider a weekend promotion.' },
    { title: 'Sales Slowdown', desc: 'Sales are lower than last week. Time to re-engage customers.' },
    { title: 'Income Alert', desc: 'A revenue dip was detected. Review your pricing strategy.' }
  ],
  'Low Margin': [
    { title: 'Profit Squeeze', desc: 'Margins are thin. Check supplier costs or raise prices.' },
    { title: 'Thin Margins', desc: 'Your profit per sale is low. Consider bulk buying for better rates.' },
    { title: 'Margin Boost', desc: 'Profit margins dropped. Optimize your overhead expenses.' }
  ],
  'Combo': [
    { title: 'Combo Potential', desc: 'Boost sales by bundling items that are missing targets.' },
    { title: 'Bundle & Save', desc: 'Create a "Smart Bundle" with under-performing items.' },
    { title: 'Mix & Match', desc: 'A combo offer could revive interest in slow-moving stock.' }
  ],
  'Default': [
    { title: 'Keep It Up!', desc: 'Your business metrics look healthy. Stay focused on growth!' },
    { title: 'Steady Growth', desc: 'Solid performance this week. Can you push it even further?' },
    { title: 'Business in Bloom', desc: 'Everything looks green. A great time to plan for expansion.' }
  ]
};

export function Dashboard() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [metrics, setMetrics] = useState({ revenue: 0, profit: 0, itemsOnTrack: 0, activeAlerts: 0 });
  const [health, setHealth] = useState({ score: 0, components: { revenue_growth: 0, profit_margin: 0, target_achievement: 0, expense_control: 0 } });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [translatedUsername, setTranslatedUsername] = useState('');
  const [isTodayLeave, setIsTodayLeave] = useState(false);
  
  // New States
  const [itemCount, setItemCount] = useState(0);
  const [growthTip, setGrowthTip] = useState<{ title: string; desc: string } | null>(null);

  const loadDashboardData = async () => {
    if (!owner) return;
    try {
      // Translate username dynamically based on language choice
      const name = owner.username || owner.shop_name || 'Owner';
      const transName = await translateDynamic(name, language);
      setTranslatedUsername(transName);

      const now = new Date();
      const todayStr = formatDate(now);

      // Check if shop is on leave today
      const { data: todayLeave } = await supabase
        .from('shop_leaves')
        .select('id, leave_type')
        .eq('owner_id', owner.id)
        .eq('leave_date', todayStr)
        .maybeSingle();

      const isTodayLeaveVal = !!todayLeave;
      setIsTodayLeave(isTodayLeaveVal);

      let activeDateStr = todayStr;

      if (isTodayLeaveVal) {
        let lastWorkingDateStr = todayStr;
        // Go back up to 7 days to find the last working day with sales and no leave
        for (let i = 1; i <= 7; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - i);
          const checkStr = formatDate(checkDate);

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

      // Fetch sales for activeDateStr instead of today
      const { data: salesToday } = await supabase
        .from('daily_sales')
        .select('quantity_sold, total_revenue, total_profit, item_id, items(cost_price, min_daily_target)')
        .eq('owner_id', owner.id)
        .eq('sale_date', activeDateStr);

      let rev = 0;
      let prof = 0;
      let itemsMetTarget = 0;

      if (salesToday) {
        salesToday.forEach((s: any) => {
          const r = Number(s.total_revenue || 0);
          const qty = Number(s.quantity_sold || 0);
          const item = Array.isArray(s.items) ? s.items[0] : s.items;

          let finalProf = 0;
          if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
            finalProf = Number(s.total_profit);
          } else if (item) {
            finalProf = r - (Number(item.cost_price || 0) * qty);
          }

          rev += r;
          prof += finalProf;

          if (qty >= (item?.min_daily_target || 0)) {
            itemsMetTarget++;
          }
        });
      }

      // Fetch active alerts count
      const { count: unreadAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', owner.id)
        .eq('is_read', false);

      setMetrics({
        revenue: rev,
        profit: prof,
        itemsOnTrack: itemsMetTarget,
        activeAlerts: unreadAlerts || 0
      });

      // Fetch latest health score
      const { data: latestHealth, error: healthError } = await supabase
        .from('health_scores')
        .select('*')
        .eq('owner_id', owner.id)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentHealth = { score: 0, components: { revenue_growth: 0, profit_margin: 0, target_achievement: 0, expense_control: 0 } };
      if (!healthError && latestHealth) {
        const targetAch = latestHealth.target_achievement_rate ?? 0;
        const profitMargin = latestHealth.profit_margin ?? 0;
        const profitScore = Math.min(100, (profitMargin / 20) * 100);
        const option2Score = Math.min(100, Math.max(0, Math.round((targetAch * 0.50) + (profitScore * 0.50))));

        currentHealth = {
          score: option2Score,
          components: {
            revenue_growth: latestHealth.revenue_growth,
            profit_margin: latestHealth.profit_margin,
            target_achievement: latestHealth.target_achievement_rate,
            expense_control: latestHealth.expense_control
          }
        };
        setHealth(currentHealth);
      }

      // Fetch top 3 recent unread alerts for this week
      const weekStart = getStartOfWeek(new Date());

      // Auto-delete alerts older than the start of this week
      await supabase
        .from('alerts')
        .delete()
        .eq('owner_id', owner.id)
        .lt('triggered_at', weekStart.toISOString());

      const { data: recentAlerts } = await supabase
        .from('alerts')
        .select('*, items(item_name)')
        .eq('owner_id', owner.id)
        .gte('triggered_at', weekStart.toISOString())
        .order('triggered_at', { ascending: false })
        .limit(3);

      let activeAlertsList: any[] = [];
      if (recentAlerts) {
        activeAlertsList = recentAlerts;
        setAlerts(recentAlerts.map(a => ({
          id: a.id,
          level: a.alert_level,
          itemName: a.items?.item_name || 'Item',
          date: new Date(a.triggered_at).toLocaleDateString(),
          message: a.alert_message,
          action: a.suggested_action,
          isToday: true // Always bright on Home page
        })));
      } else {
        setAlerts([]);
      }

      // Fetch registered items count
      const { count: itemsCountVal } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', owner.id);
      setItemCount(itemsCountVal || 0);

      // AI Smart Growth Tip calculation
      const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
      const calculatedTips = [];

      if (activeAlertsList.length > 0) {
        const hasConsecutiveMisses = activeAlertsList.some(a => a.days_missed >= 3);
        if (hasConsecutiveMisses) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Combo']);
          calculatedTips.push({ title: v.title, desc: v.desc });
        }

        const hasDeadStock = activeAlertsList.some(a => a.alert_level === 'Dead Stock');
        if (hasDeadStock) {
          calculatedTips.push({
            title: 'Dead Stock Detected',
            desc: 'An item has zero movement. Consider a heavy clearance discount.'
          });
        }
      }

      if (latestHealth) {
        if (latestHealth.revenue_growth < 100) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Revenue Drop']);
          calculatedTips.push({ title: v.title, desc: v.desc });
        }
        if (latestHealth.profit_margin < 20) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Low Margin']);
          calculatedTips.push({ title: v.title, desc: v.desc });
        }
      }

      if (calculatedTips.length === 0) {
        const v = getRandomItem(INSIGHT_VARIATIONS['Default']);
        calculatedTips.push({ title: v.title, desc: v.desc });
      }

      const selectedTip = getRandomItem(calculatedTips);
      const translatedTitle = await translateDynamic(selectedTip.title, language);
      const translatedDesc = await translateDynamic(selectedTip.desc, language);
      setGrowthTip({ title: translatedTitle, desc: translatedDesc });

      // Fetch weekly sales data for the chart (last 7 days)
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      
      const startDay = formatDate(last7Days[0]);
      const endDay = formatDate(last7Days[6]);

      const { data: weeklySales } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('owner_id', owner.id)
        .gte('sale_date', startDay)
        .lte('sale_date', endDay);

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      const chartMap = new Map();
      last7Days.forEach(d => {
        chartMap.set(formatDate(d), { day: daysOfWeek[d.getDay()], revenue: 0, sales: 0 });
      });

      if (weeklySales) {
        weeklySales.forEach(sale => {
          if (chartMap.has(sale.sale_date)) {
            const current = chartMap.get(sale.sale_date);
            current.revenue += Number(sale.total_revenue || 0);
            current.sales += Number(sale.quantity_sold || 0);
          }
        });
      }

      setChartData(Array.from(chartMap.values()));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    if (!owner) return;
    setLoading(true);
    loadDashboardData().then(() => setLoading(false));
  }, [owner, language]);

  const toggleShopStatus = async () => {
    if (togglingStatus || !owner) return;
    setTogglingStatus(true);

    try {
      const todayStr = formatDate(new Date());

      if (isTodayLeave) {
        // Mark as open by deleting from shop_leaves
        await supabase
          .from('shop_leaves')
          .delete()
          .eq('owner_id', owner.id)
          .eq('leave_date', todayStr);
      } else {
        // Mark as leave by inserting into shop_leaves
        await supabase
          .from('shop_leaves')
          .insert({
            owner_id: owner.id,
            leave_date: todayStr,
            leave_type: 'Leave'
          });
      }

      // Re-fetch data to update metrics and UI
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to toggle shop status:', err);
    } finally {
      setTogglingStatus(false);
    }
  };

  const getTranslatedVerdict = (score: number) => {
    if (score >= 80) return t('Healthy');
    if (score >= 50) return t('Work in Progress');
    return t('Needs Attention');
  };
  
  const getVerdictDescription = (score: number) => {
    if (score >= 80) return t('Everything looks great');
    if (score >= 50) return t('Some areas need improvement');
    return t('Monitor sales, profits and targets');
  };
  
  const getRingColor = (score: number) => {
    if (score >= 90) return '#16A34A';
    if (score >= 80) return '#22C55E';
    if (score >= 70) return '#84CC16';
    if (score >= 60) return '#F59E0B';
    if (score >= 50) return '#F97316';
    if (score >= 40) return '#EF4444';
    if (score >= 30) return '#DC2626';
    return '#7F1D1D';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Good morning');
    if (hour < 17) return t('Good afternoon');
    return t('Good evening');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SHOP ON LEAVE BANNER */}
      {isTodayLeave && (
        <div className="bg-[#FEF3C7] border border-[#F59E0B] p-4 rounded-xl flex items-center gap-3 shadow-sm text-[#854F0B]">
          <Umbrella className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <h4 className="font-bold text-sm">{t('Shop is on Leave Today')}</h4>
            <p className="text-xs">{t('Showing data from last working day')}</p>
          </div>
        </div>
      )}

      {/* TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Health Score, Shop Status & Inventory, Smart Growth Tip */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* BUSINESS HEALTH SCORE CARD - MOBILE GRADIENT CONTAINER */}
          <div 
            onClick={() => navigate('/health')}
            className="bg-[#1E3A5F] bg-gradient-to-br from-[#1E3A5F] to-[#11243C] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-primary/20 space-y-6 cursor-pointer hover:shadow-xl hover:opacity-95 active:scale-[0.995] transition-all duration-200"
          >
            
            {/* Top Header of Health Score with Circle Gauge and Verdict */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-4 border-b border-white/10">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Business Health Score')}</h2>
                <p className="text-white/60 text-xs sm:text-sm mt-1">{t('This Week')}</p>
                
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
                    {getTranslatedVerdict(health.score)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Progress Circle */}
                <div className="relative flex flex-col items-center">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke={getRingColor(health.score)}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 45}
                      strokeDashoffset={2 * Math.PI * 45 - (health.score / 100) * (2 * Math.PI * 45)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-2xl font-extrabold text-white">{health.score}</span>
                  </div>
                </div>
                
                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white">{getTranslatedVerdict(health.score)}</h3>
                  <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-[200px] leading-relaxed">
                    {getVerdictDescription(health.score)}
                  </p>
                </div>
              </div>
            </div>

            {/* Nested Metric Cards Inside Dark Blue Container */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between hover-lift">
                <span className="text-[10px] sm:text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Revenue')}</span>
                <span className="text-base sm:text-xl font-black text-primary mt-2">{formatCurrency(metrics.revenue)}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between hover-lift">
                <span className="text-[10px] sm:text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Profit')}</span>
                <span className="text-base sm:text-xl font-black text-primary mt-2">{formatCurrency(metrics.profit)}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between hover-lift">
                <span className="text-[10px] sm:text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('Alerts')}</span>
                <span className="text-base sm:text-xl font-black text-danger mt-2">{metrics.activeAlerts}</span>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between hover-lift">
                <span className="text-[10px] sm:text-xs font-semibold text-textSecondary uppercase tracking-wider">{t('On Track')}</span>
                <span className="text-base sm:text-xl font-black text-success mt-2">{metrics.itemsOnTrack}</span>
              </div>
            </div>

          </div>

          {/* Shop Status and Inventory side-by-side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* SHOP STATUS CARD */}
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover-lift">
              <div className="flex items-center gap-2.5 mb-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-textSecondary">{t('Shop Status')}</h3>
              </div>
              
              <div className="my-3">
                <span className={`text-xl font-bold ${isTodayLeave ? 'text-warning' : 'text-success'}`}>
                  {isTodayLeave ? t('On Leave') : t('Open & Active')}
                </span>
              </div>

              <button
                onClick={toggleShopStatus}
                disabled={togglingStatus}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                  isTodayLeave 
                    ? 'bg-success text-white hover:bg-success/90 shadow-md shadow-success/15' 
                    : 'bg-danger/10 text-danger hover:bg-danger/15'
                }`}
              >
                {togglingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isTodayLeave ? (
                  t('Mark Open')
                ) : (
                  t('Mark Leave')
                )}
              </button>
            </div>

            {/* INVENTORY OVERVIEW CARD */}
            <div 
              onClick={() => navigate('/items')}
              className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover-lift cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-textSecondary">{t('Inventory')}</h3>
              </div>

              <div className="my-2">
                <div className="text-3xl font-extrabold text-primary">
                  {itemCount} <span className="text-sm font-medium text-textSecondary">{itemCount === 1 ? t('Item') : t('Items')}</span>
                </div>
                <p className="text-xs text-textSecondary mt-1">{t('Prices & Targets')}</p>
              </div>

              <div className="flex items-center justify-end gap-1 text-primary text-xs font-bold mt-2">
                {t('Manage')}
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </div>

          {/* AI SMART INSIGHT CARD */}
          {growthTip && (
            <div 
              onClick={() => navigate('/tips')}
              className="rounded-2xl border border-[#FDE8B4] overflow-hidden cursor-pointer hover-lift shadow-sm bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-5"
            >
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="bg-[#FEF3C7] p-2 rounded-xl border border-[#FDE8B4]">
                    <Lightbulb className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs font-bold text-[#B45309]">{t('Smart Growth Tip')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-textSecondary" />
              </div>
              <h4 className="font-bold text-primary mb-1 text-base sm:text-lg">{growthTip.title}</h4>
              <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">{growthTip.desc}</p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Recent Alerts (aligned straight at top with Health Score Card) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass p-6 rounded-2xl bg-white border border-border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary">{t('Recent Alerts')}</h3>
              <Link to="/alerts" className="text-sm text-accent hover:underline font-semibold">{t('View all')}</Link>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-textSecondary">{t('No active alerts.')}</p>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <AlertCard key={alert.id} {...alert} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
