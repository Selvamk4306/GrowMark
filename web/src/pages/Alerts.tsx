/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCard } from '../components/AlertCard';
import { Check } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { translateDynamic } from '../lib/translationService';
import { getStartOfWeek } from '../lib/businessLogic';

export function Alerts() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (!owner) return;
    
    async function loadAlerts() {
      setLoading(true);
      try {
        const weekStart = getStartOfWeek(new Date());
        
        // Auto-delete alerts older than the start of this week
        await supabase
          .from('alerts')
          .delete()
          .eq('owner_id', owner.id)
          .lt('triggered_at', weekStart.toISOString());

        const { data } = await supabase
          .from('alerts')
          .select('*, items(item_name)')
          .eq('owner_id', owner.id)
          .gte('triggered_at', weekStart.toISOString())
          .order('alert_level', { ascending: false })
          .order('triggered_at', { ascending: false });

        if (data) {
          const translatedAlerts = await Promise.all(data.map(async (alert) => {
            const translatedMsg = await translateDynamic(alert.alert_message || '', language);
            const translatedAction = await translateDynamic(alert.suggested_action || '', language);
            const translatedItemName = await translateDynamic(alert.items?.item_name || 'Item', language);
            const alertDate = new Date(alert.triggered_at);
            const today = new Date();
            const isToday = alertDate.getDate() === today.getDate() &&
                            alertDate.getMonth() === today.getMonth() &&
                            alertDate.getFullYear() === today.getFullYear();
            return {
              ...alert,
              isToday,
              alert_message: translatedMsg,
              suggested_action: translatedAction,
              items: alert.items ? { ...alert.items, item_name: translatedItemName } : null
            };
          }));
          setAlerts(translatedAlerts);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAlerts();
  }, [owner, language]);

  const markAsRead = async (id: number) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const filteredAlerts = filter === 'All' ? alerts : alerts.filter(a => a.alert_level === filter);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('Alerts')}</h1>
          <p className="text-textSecondary">{t('Action items requiring your attention')}</p>
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {['All', 'Warning', 'Alert', 'Critical', 'Dead Stock'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              filter === f 
                ? 'bg-primary text-white' 
                : 'bg-white border border-border text-textSecondary hover:bg-background'
            }`}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-8 text-textSecondary">{t('Calculating...')}</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-primary">{t('All Caught Up!')}</h2>
          <p className="text-textSecondary mt-2">{t("No active alerts. You're doing great!")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className="relative group">
              <AlertCard 
                level={alert.alert_level}
                itemName={alert.items?.item_name || 'Item'}
                date={new Date(alert.triggered_at).toLocaleDateString()}
                message={alert.alert_message}
                action={alert.suggested_action}
                isToday={alert.isToday}
              />
              <button 
                onClick={() => markAsRead(alert.id)}
                className="absolute top-4 right-4 text-sm font-semibold text-primary bg-white px-3 py-1 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
              >
                {t('Mark Read')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
