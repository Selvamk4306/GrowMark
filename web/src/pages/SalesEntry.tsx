/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency, runConsecutiveFailureDetection, calculateBusinessHealthScore, getStartOfWeek } from '../lib/businessLogic';
import { Save } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { translateBatch } from '../lib/translationService';

export function SalesEntry() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const [date, setDate] = useState(formatDate(new Date()));
  const [items, setItems] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    if (!owner) return;
    
    async function loadData() {
      setLoading(true);
      try {
        // Fetch items
        const { data: itemsData } = await supabase.from('items').select('*').eq('owner_id', owner.id);
        if (itemsData) {
          const itemNames = itemsData.map((item: any) => item.item_name);
          const translatedNames = await translateBatch(itemNames, language);
          const translatedItems = itemsData.map((item: any, idx: number) => ({
            ...item,
            item_name: translatedNames[idx]
          }));
          setItems(translatedItems);
        } else {
          setItems([]);
        }

        // Fetch sales for selected date
        const { data: sales } = await supabase
          .from('daily_sales')
          .select('*')
          .eq('owner_id', owner.id)
          .eq('sale_date', date);

        const initialSales: Record<string, number> = {};
        if (sales) {
          sales.forEach(s => {
            initialSales[s.item_id] = s.quantity_sold;
          });
        }
        setSalesData(initialSales);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [owner, date, language]);

  const handleQuantityChange = (itemId: string, change: number) => {
    setSalesData(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
  };

  const setExactQuantity = (itemId: string, val: string) => {
    if (val === '') {
      setSalesData(prev => ({ ...prev, [itemId]: 0 }));
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setSalesData(prev => ({ ...prev, [itemId]: num }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing entries for this date
      await supabase.from('daily_sales').delete().eq('owner_id', owner.id).eq('sale_date', date);

      // Insert new entries
      const inserts = items
        .filter(item => salesData[item.id] !== undefined && salesData[item.id] > 0)
        .map(item => {
          const qty = salesData[item.id];
          const revenue = qty * item.selling_price;
          const profit = revenue - (qty * item.cost_price);
          return {
            owner_id: owner.id,
            item_id: item.id,
            sale_date: date,
            quantity_sold: qty,
            total_revenue: revenue,
            total_profit: profit
          };
        });

      if (inserts.length > 0) {
        await supabase.from('daily_sales').insert(inserts);
      }
      
      // Run alert threshold & failure detection for all items
      for (const item of items) {
        await runConsecutiveFailureDetection(owner.id, item.id, date);
      }

      // Recalculate health score for the week
      const weekStart = getStartOfWeek(new Date(date));
      await calculateBusinessHealthScore(owner.id, formatDate(weekStart));
      
      alert(t('Sales data saved successfully!'));
    } catch (err: any) {
      console.error(err);
      alert(t('Error saving sales data: ') + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{t('Sales Entry')}</h1>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-textSecondary">{t('Date')}:</label>
          <input
            type="date"
            value={date}
            max={formatDate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl focus:border-primary outline-none"
          />
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-white/50">
          <h2 className="font-semibold text-primary">{t('Enter Sales Data')}</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-textSecondary">{t('Calculating...')}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-textSecondary">{t('No items found.')}</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const qty = salesData[item.id] || 0;
              const rev = qty * item.selling_price;
              return (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-background/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold text-textPrimary">{item.item_name}</h4>
                    <p className="text-xs text-textSecondary">{t('Target')}: {item.min_daily_target} / {t('Price') || 'Price'}: {formatCurrency(item.selling_price)}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 bg-background rounded-xl p-1 border border-border">
                      <button 
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-textPrimary shadow-sm transition-colors"
                      >
                        -
                      </button>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={salesData[item.id] === undefined ? 0 : salesData[item.id]}
                        onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          const clean = raw.replace(/^0+(?=\d)/, '');
                          setExactQuantity(item.id, clean);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-14 px-1 py-1 text-center font-bold text-[#1E3A5F] rounded-lg border border-transparent focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/30 focus:bg-blue-50/80 outline-none transition-all cursor-text"
                      />
                      <button 
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-textPrimary shadow-sm transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="w-24 text-right">
                      <span className="font-bold text-primary">{formatCurrency(rev)}</span>
                      <span className="text-xs text-textSecondary block">{t('Revenue')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <button className="px-6 py-3 rounded-xl border-2 border-border font-semibold text-textSecondary hover:border-textSecondary transition-colors">
          {t('Mark as Leave')}
        </button>
        <button 
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="px-6 py-3 rounded-xl bg-primary text-white font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? t('Updating...') : t('Submit Sales')}</span>
        </button>
      </div>
    </div>
  );
}
