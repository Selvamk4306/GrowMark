/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { HealthScoreCard } from '../components/HealthScoreCard';

export function HealthScore() {
  const { owner } = useAuth();
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
          const score = Math.round(
            (data.revenue_growth * 0.30) +
            (data.profit_margin * 0.30) +
            (data.target_achievement_rate * 0.20) +
            (data.expense_control * 0.20)
          );

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
      <h1 className="text-2xl font-bold text-primary">Health Score Detailed</h1>
      
      {loading ? (
        <div className="text-center p-8 text-textSecondary">Loading health score...</div>
      ) : healthData ? (
        <HealthScoreCard score={healthData.score} components={healthData.components} />
      ) : (
        <div className="text-center p-8 text-textSecondary">No health score data available yet.</div>
      )}
    </div>
  );
}
