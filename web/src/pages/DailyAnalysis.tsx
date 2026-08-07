/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { translateBatch } from '../lib/translationService';
import { formatDate, formatCurrency } from '../lib/businessLogic';
import { ArrowLeft, Calendar, IndianRupee, TrendingUp, Target, Plus, AlertCircle } from 'lucide-react';

export function DailyAnalysis() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, metTarget: 0 });

  const fetchAnalysis = async (dateStr: string) => {
    if (!owner) return;
    setLoading(true);
    try {
      const { data: sales } = await supabase
        .from('daily_sales')
        .select('quantity_sold, total_revenue, total_profit, items(item_name, min_daily_target, cost_price)')
        .eq('owner_id', owner.id)
        .eq('sale_date', dateStr);

      if (sales && sales.length > 0) {
        let revTotal = 0;
        let profTotal = 0;
        let metCount = 0;

        const processed = sales.map((s: any) => {
          const rev = Number(s.total_revenue) || 0;
          const qty = Number(s.quantity_sold) || 0;
          const item = Array.isArray(s.items) ? s.items[0] : s.items;
          const costPrice = Number(item?.cost_price || 0);

          let currentProf = 0;
          if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
            currentProf = Number(s.total_profit);
          } else if (item) {
            currentProf = rev - (costPrice * qty);
          }

          revTotal += rev;
          profTotal += currentProf;
          
          const target = item?.min_daily_target || 0;
          let status = t('Met Target');
          let badgeClass = 'bg-success/10 text-success border border-success/20';
          
          if (qty === 0) {
            status = t('Zero Sales');
            badgeClass = 'bg-danger/10 text-danger border border-danger/20';
          } else if (qty < target) {
            status = t('Below Target');
            badgeClass = 'bg-warning/10 text-warning border border-warning/20';
          } else {
            metCount++;
          }

          return {
            name: item?.item_name || 'Unknown Item',
            qty,
            target,
            revenue: rev,
            profit: currentProf,
            status,
            badgeClass
          };
        });

        // Dynamic translation of item names
        const itemNames = processed.map((p: any) => p.name);
        const translatedNames = await translateBatch(itemNames, language);
        const translatedProcessed = processed.map((p: any, i: number) => ({ ...p, name: translatedNames[i] }));

        setAnalysis(translatedProcessed);
        setSummary({ revenue: revTotal, profit: profTotal, metTarget: metCount });
      } else {
        setAnalysis([]);
        setSummary({ revenue: 0, profit: 0, metTarget: 0 });
      }
    } catch (error) {
      console.error('Error fetching daily analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(selectedDate);
  }, [selectedDate, owner, language]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-background border border-border rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('Daily Analysis')}</h1>
            <p className="text-textSecondary text-sm mt-0.5">{t('Analyze performance for a specific date')}</p>
          </div>
        </div>

        {/* Date Selector input */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-border rounded-xl shadow-sm focus-within:border-primary">
          <Calendar className="w-5 h-5 text-textSecondary" />
          <input 
            type="date" 
            className="outline-none text-sm font-semibold text-textPrimary bg-transparent"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : analysis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-border rounded-2xl p-6 shadow-sm">
          <AlertCircle className="w-16 h-16 text-textSecondary mb-4 stroke-[1.5]" />
          <p className="text-textSecondary text-lg text-center font-medium">
            {t('No data for')} {selectedDate === formatDate(new Date()) ? t('Today') : selectedDate}.
          </p>
          <button 
            onClick={() => navigate('/sales')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('Enter Sales Data')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-primary text-white p-6 rounded-2xl shadow-md border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-xs text-white/70 font-semibold">{t('Revenue')}</div>
                <div className="text-xl font-bold">{formatCurrency(summary.revenue)}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="text-xs text-white/70 font-semibold">{t('Profit')}</div>
                <div className="text-xl font-bold">{formatCurrency(summary.profit)}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-white/70 font-semibold">{t('Met Target')}</div>
                <div className="text-xl font-bold">{summary.metTarget} / {analysis.length}</div>
              </div>
            </div>
          </div>

          {/* ITEM CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysis.map((item, idx) => (
              <div key={idx} className="bg-white border border-border rounded-xl p-5 hover-lift shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-primary truncate max-w-[60%]">{item.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.badgeClass}`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-textPrimary">{item.qty}</div>
                    <div className="text-[10px] text-textSecondary mt-1">
                      {t('Sold')} ({t('Target')}: {item.target})
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold text-textPrimary">{formatCurrency(item.revenue)}</div>
                    <div className="text-[10px] text-textSecondary mt-1">{t('Revenue')}</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold text-textPrimary">{formatCurrency(item.profit)}</div>
                    <div className="text-[10px] text-textSecondary mt-1">{t('Profit')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
