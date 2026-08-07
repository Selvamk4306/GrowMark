/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { useTranslation } from '../hooks/useTranslation';

export function HealthScore() {
  const { owner } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);



  useEffect(() => {
    if (!owner) return;
    
    async function loadHealthScore() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('health_scores')
          .select('*')
          .eq('owner_id', owner.id)
          .order('week_start_date', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          const score = data.score ?? 0;

          setHealthData({
            score,
            components: {
              revenue_growth: data.revenue_growth,
              profit_margin: data.profit_margin,
              target_achievement: data.target_achievement_rate,
              expense_control: data.expense_control
            }
          });
        }
      } catch (error) {
        console.error('Error fetching health score:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadHealthScore();
  }, [owner]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">{t('Business Health Score')}</h1>
      
      {loading ? (
        <div className="text-center p-8 text-textSecondary">{t('Calculating...')}</div>
      ) : healthData ? (
        <HealthScoreCard score={healthData.score} components={healthData.components} />
      ) : (
        <div className="text-center p-8 text-textSecondary">{t('No health score data available yet.')}</div>
      )}
    </div>
  );
}
