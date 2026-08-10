import { useEffect, useState } from 'react';
import { Lightbulb, Tag, AlertTriangle, TrendingDown, Wallet, Star, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { translateBatch } from '../lib/translationService';
import { supabase } from '../lib/supabase';
import { INSIGHT_VARIATIONS } from '../lib/businessLogic';

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function GrowthTips() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<{ title: string; desc: string; iconType: string }[]>([]);

  useEffect(() => {
    async function generateTips() {
      if (!owner) return;
      setLoading(true);
      try {
        // Fetch unread alerts
        const { data: alerts } = await supabase
          .from('alerts')
          .select('*')
          .eq('owner_id', owner.id)
          .eq('is_read', false);
        
        // Fetch latest health score
        const { data: hs } = await supabase
          .from('health_scores')
          .select('*')
          .eq('owner_id', owner.id)
          .order('week_start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const newTips: { title: string; desc: string; iconType: string }[] = [];

        if (alerts && alerts.length > 0) {
          const hasConsecutiveMisses = alerts.some((a: any) => a.days_missed >= 3);
          if (hasConsecutiveMisses) {
            const v = getRandomItem(INSIGHT_VARIATIONS['Combo']);
            newTips.push({ title: v.title, desc: v.desc, iconType: 'combo' });
          }

          const hasDeadStock = alerts.some((a: any) => a.alert_level === 'Dead Stock');
          if (hasDeadStock) {
            newTips.push({
              title: 'Dead Stock Detected',
              desc: 'An item has zero movement. Consider a heavy clearance discount.',
              iconType: 'dead_stock'
            });
          }
        }

        if (hs) {
          if (hs.revenue_growth < 100) { 
            const v = getRandomItem(INSIGHT_VARIATIONS['Revenue Drop']);
            newTips.push({ title: v.title, desc: v.desc, iconType: 'revenue_drop' });
          }

          if (hs.profit_margin < 20) {
            const v = getRandomItem(INSIGHT_VARIATIONS['Low Margin']);
            newTips.push({ title: v.title, desc: v.desc, iconType: 'low_margin' });
          }
        }

        // Add a default tip if empty
        if (newTips.length === 0) {
          const v = getRandomItem(INSIGHT_VARIATIONS['Default']);
          newTips.push({ title: v.title, desc: v.desc, iconType: 'default' });
        }

        const titles = newTips.map(tip => tip.title);
        const descs = newTips.map(tip => tip.desc);
        const translatedTitles = await translateBatch(titles, language);
        const translatedDescs = await translateBatch(descs, language);

        setTips(newTips.map((tip, i) => ({
          ...tip,
          title: translatedTitles[i] || tip.title,
          desc: translatedDescs[i] || tip.desc
        })));

      } catch (error) {
        console.error('Error generating growth tips:', error);
      } finally {
        setLoading(false);
      }
    }

    generateTips();
  }, [owner, language]);

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case 'combo':
        return <Tag className="w-6 h-6 text-accent" />;
      case 'dead_stock':
        return <AlertTriangle className="w-6 h-6 text-danger" />;
      case 'revenue_drop':
        return <TrendingDown className="w-6 h-6 text-[#F59E0B]" />;
      case 'low_margin':
        return <Wallet className="w-6 h-6 text-primary" />;
      default:
        return <Star className="w-6 h-6 text-accent" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-primary transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{t("This Week's Insights")}</h1>
            <p className="text-sm text-textSecondary">{t('Actionable insights to boost your business')}</p>
          </div>
        </div>
        <div className="p-3 bg-accent/10 rounded-xl">
          <Lightbulb className="w-7 h-7 text-accent" />
        </div>
      </div>

      {/* Cards List / Loading State */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-border p-6 shadow-sm">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-textSecondary font-medium">{t('Loading insights...')}</p>
          </div>
        ) : tips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-border p-6 shadow-sm">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-textSecondary text-base font-medium">{t('Insufficient data to generate tips right now.')}</p>
          </div>
        ) : (
          tips.map((tip, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-border shadow-sm hover-lift transition-all">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE8B4] rounded-2xl shrink-0">
                  {renderIcon(tip.iconType)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-primary">{tip.title}</h3>
                  <p className="text-textSecondary leading-relaxed text-sm">{tip.desc}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
