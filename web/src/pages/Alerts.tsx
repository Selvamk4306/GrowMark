/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCard } from '../components/AlertCard';
import { Check } from 'lucide-react';

export function Alerts() {
  const { owner } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (!owner) return;
    
    async function loadAlerts() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('alerts')
          .select('*, items(item_name)')
          .eq('owner_id', owner.id)
          .eq('is_read', false)
          .order('alert_level', { ascending: false })
          .order('triggered_at', { ascending: false });

        if (data) {
          setAlerts(data);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAlerts();
  }, [owner]);

  const markAsRead = async (id: number) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const filteredAlerts = filter === 'All' ? alerts : alerts.filter(a => a.alert_level === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary">Alerts</h1>
          <p className="text-textSecondary">Action items requiring your attention</p>
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
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-8 text-textSecondary">Loading alerts...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-primary">All Caught Up!</h2>
          <p className="text-textSecondary mt-2">There are no active alerts requiring your attention.</p>
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
              />
              <button 
                onClick={() => markAsRead(alert.id)}
                className="absolute top-4 right-4 text-sm font-semibold text-primary bg-white px-3 py-1 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
              >
                Mark Read
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
