/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDate } from '../lib/businessLogic';

export function Reports() {
  const { owner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);



  useEffect(() => {
    if (!owner) return;
    
    async function loadReports() {
      setLoading(true);
      try {
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d;
        });
        
        const startDay = formatDate(last7Days[0]);
        const endDay = formatDate(last7Days[6]);

        const { data: sales } = await supabase
          .from('daily_sales')
          .select('*')
          .eq('owner_id', owner.id)
          .gte('sale_date', startDay)
          .lte('sale_date', endDay);

        const chartMap = new Map();
        last7Days.forEach(d => {
          chartMap.set(formatDate(d), { date: formatDate(d), revenue: 0 });
        });

        if (sales) {
          sales.forEach(sale => {
            if (chartMap.has(sale.sale_date)) {
              chartMap.get(sale.sale_date).revenue += Number(sale.total_revenue || 0);
            }
          });
        }

        setReportData(Array.from(chartMap.values()));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadReports();
  }, [owner]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Weekly Reports</h1>
      
      {loading ? (
        <div className="text-center p-8 text-textSecondary">Loading reports...</div>
      ) : (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-primary">Revenue by Date</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#F4A833" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
