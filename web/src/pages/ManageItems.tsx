import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/businessLogic';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { translateBatch } from '../lib/translationService';

export function ManageItems() {
  const { owner } = useAuth();
  const { t, language } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    item_name: '',
    selling_price: '',
    cost_price: '',
    min_daily_target: '',
    min_weekly_target: ''
  });

  const loadItems = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    const { data } = await supabase
      .from('items')
      .select('id, owner_id, item_name, selling_price, cost_price, min_daily_target, min_weekly_target')
      .eq('owner_id', owner.id)
      .order('item_name');
    if (data) {
      const itemNames = data.map((item: any) => item.item_name);
      const translatedNames = await translateBatch(itemNames, language);
      const translatedItems = data.map((item: any, idx: number) => ({
        ...item,
        item_name: translatedNames[idx]
      }));
      setItems(translatedItems);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [owner, language]);

  useEffect(() => {
    if (!owner) return;
    loadItems();
  }, [owner, loadItems]);

  const handleOpenModal = (item: any | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item_name: item.item_name,
        selling_price: item.selling_price.toString(),
        cost_price: item.cost_price.toString(),
        min_daily_target: item.min_daily_target.toString(),
        min_weekly_target: item.min_weekly_target.toString()
      });
    } else {
      setEditingItem(null);
      setFormData({ item_name: '', selling_price: '', cost_price: '', min_daily_target: '', min_weekly_target: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      owner_id: owner.id,
      item_name: formData.item_name,
      selling_price: Number(formData.selling_price),
      cost_price: Number(formData.cost_price),
      min_daily_target: Number(formData.min_daily_target),
      min_weekly_target: Number(formData.min_weekly_target)
    };

    if (editingItem) {
      await supabase.from('items').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('items').insert([payload]);
    }

    setShowModal(false);
    loadItems();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('Are you sure you want to delete this item?'))) {
      await supabase.from('items').delete().eq('id', id);
      loadItems();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('Manage Items')}</h1>
          <p className="text-textSecondary">{t('Add, edit or remove products')}</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>{t('Add Item')}</span>
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border text-sm text-textSecondary uppercase tracking-wider">
                <th className="p-4 font-semibold">{t('Item Name')}</th>
                <th className="p-4 font-semibold">{t('Price / Cost')}</th>
                <th className="p-4 font-semibold">{t('Daily Target')}</th>
                <th className="p-4 font-semibold">{t('Weekly Target')}</th>
                <th className="p-4 font-semibold text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-textSecondary">{t('Calculating...')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-textSecondary">{t('No items found.')}</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-background/30 transition-colors">
                    <td className="p-4 font-semibold text-textPrimary">{item.item_name}</td>
                    <td className="p-4">
                      <div className="font-semibold text-primary">{formatCurrency(item.selling_price)}</div>
                      <div className="text-xs text-textSecondary">{t('Cost')}: {formatCurrency(item.cost_price)}</div>
                    </td>
                    <td className="p-4 font-medium text-textPrimary">{item.min_daily_target}</td>
                    <td className="p-4 font-medium text-textPrimary">{item.min_weekly_target}</td>
                    <td className="p-4 flex justify-end space-x-2">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-textSecondary hover:text-accent bg-white rounded-lg border border-border shadow-sm transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-textSecondary hover:text-danger bg-white rounded-lg border border-border shadow-sm transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-lg font-bold text-primary">{editingItem ? t('Edit Item') : t('Add New Item')}</h2>
              <button onClick={() => setShowModal(false)} className="text-textSecondary hover:text-textPrimary">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">{t('Item Name')}</label>
                <input required type="text" value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} className="w-full px-4 py-2 border border-border rounded-xl focus:border-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">{t('Price / Cost')}</label>
                  <input required type="number" min="0" value={formData.selling_price} onChange={e => setFormData({ ...formData, selling_price: e.target.value })} className="w-full px-4 py-2 border border-border rounded-xl focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">{t('Cost')}</label>
                  <input required type="number" min="0" value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} className="w-full px-4 py-2 border border-border rounded-xl focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">{t('Daily Target')}</label>
                  <input required type="number" min="0" value={formData.min_daily_target} onChange={e => setFormData({ ...formData, min_daily_target: e.target.value })} className="w-full px-4 py-2 border border-border rounded-xl focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">{t('Weekly Target')}</label>
                  <input required type="number" min="0" value={formData.min_weekly_target} onChange={e => setFormData({ ...formData, min_weekly_target: e.target.value })} className="w-full px-4 py-2 border border-border rounded-xl focus:border-primary outline-none" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-textSecondary font-semibold hover:bg-background rounded-xl transition-colors">{t('Cancel')}</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">{editingItem ? t('Save Changes') : t('Add Item')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
