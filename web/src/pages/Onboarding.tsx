import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { LoadingScreen } from '../components/LoadingScreen';
import { 
  ArrowRight, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';

const SHOP_TYPES = ['Grocery', 'Food and Beverage', 'Salon', 'Pharmacy', 'Clothing', 'Hardware', 'Other'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ItemInput = {
  id: string;
  item_name: string;
  selling_price: string;
  cost_price: string;
  min_daily_target: string;
  min_weekly_target: string;
};

export function Onboarding() {
  const { session, refreshOwner } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Start directly at Step 1 (Shop Setup)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Step 1: Shop Setup state
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('');
  const [location, setLocation] = useState('');

  // Step 2: Working Days state
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

  // Step 3: Item Setup state
  const [items, setItems] = useState<ItemInput[]>([
    { id: '1', item_name: '', selling_price: '', cost_price: '', min_daily_target: '', min_weekly_target: '' }
  ]);

  // Clean error on step change
  useEffect(() => {
    setError('');
  }, [step]);

  // Helper to safely obtain user
  const getUser = async () => {
    if (session?.user) return session.user;
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  };

  // Step 1 Continue: Create Owner profile
  const handleShopSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shopName || !shopType) {
      setError(t('Shop Name and Shop Type are required.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await getUser();
      if (!user) {
        throw new Error(t('User session not found. Please log in again.'));
      }

      const username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner';
      
      // Check if owner already exists
      const { data: existingOwner } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let currentOwnerId = '';

      if (existingOwner) {
        // Update existing owner
        const { data: updatedOwner, error: updateError } = await supabase
          .from('owners')
          .update({
            shop_name: shopName,
            shop_type: shopType,
            location: location,
            username: username
          })
          .eq('id', existingOwner.id)
          .select()
          .single();

        if (updateError) throw updateError;
        currentOwnerId = updatedOwner.id;
      } else {
        // Insert new owner
        const { data: newOwner, error: insertError } = await supabase
          .from('owners')
          .insert([
            {
              user_id: user.id,
              shop_name: shopName,
              shop_type: shopType,
              location: location,
              username: username
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        currentOwnerId = newOwner.id;
      }

      setOwnerId(currentOwnerId);
      setStep(2);
    } catch (err: any) {
      setError(err.message || t('Failed to save shop profile.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Continue: Save working days
  const handleWorkingDaysSetup = async () => {
    if (selectedDays.length === 0) {
      setError(t('Please select at least one working day.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await getUser();
      if (!user) throw new Error(t('User session not found. Please log in again.'));

      let activeOwnerId = ownerId;
      if (!activeOwnerId) {
        const { data: currentOwner } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!currentOwner) throw new Error(t('Owner profile not found'));
        activeOwnerId = currentOwner.id;
        setOwnerId(activeOwnerId);
      }

      const { error: updateError } = await supabase
        .from('owners')
        .update({ working_days: selectedDays })
        .eq('id', activeOwnerId);

      if (updateError) throw updateError;
      setStep(3);
    } catch (err: any) {
      setError(err.message || t('Failed to save working days.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 3 Actions: Add, remove, edit items
  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), item_name: '', selling_price: '', cost_price: '', min_daily_target: '', min_weekly_target: '' }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemInput, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Step 3 Finish: Insert items and redirect
  const handleDone = async () => {
    const validItems = items.filter(i => i.item_name && i.selling_price && i.min_daily_target && i.min_weekly_target);

    if (validItems.length === 0) {
      setError(t('Please completely fill out at least one item.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await getUser();
      if (!user) throw new Error(t('User session not found. Please log in again.'));

      let activeOwnerId = ownerId;
      if (!activeOwnerId) {
        const { data: currentOwner } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!currentOwner) throw new Error(t('Owner profile not found'));
        activeOwnerId = currentOwner.id;
        setOwnerId(activeOwnerId);
      }

      const itemsToInsert = validItems.map(item => ({
        owner_id: activeOwnerId,
        item_name: item.item_name,
        selling_price: parseFloat(item.selling_price),
        cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
        min_daily_target: parseInt(item.min_daily_target, 10),
        min_weekly_target: parseInt(item.min_weekly_target, 10),
      }));

      const { error: insertError } = await supabase.from('items').insert(itemsToInsert);

      if (insertError) throw insertError;

      // Update AuthContext owner and navigate to dashboard
      await refreshOwner(user.id);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('Failed to save items.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      const newDays = [...selectedDays, day];
      newDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
      setSelectedDays(newDays);
    }
  };

  const setMonToSat = () => setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const setMonToSun = () => setSelectedDays([...DAYS]);

  const handleBack = () => {
    if (step === 1) {
      navigate('/login');
    } else {
      setStep(step - 1);
    }
  };

  const progressPercentage = step === 1 ? 33 : step === 2 ? 66 : 100;

  if (loading) {
    return <LoadingScreen message={t('Saving setup details...')} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex flex-col justify-between pt-8 pb-4 px-4 sm:px-6 select-none">
      
      {/* Container */}
      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-between">
        <div>
          {/* Top Progress Bar & Header (Matches App shop-setup.tsx structure) */}
          <div className="mb-6 px-1">
            <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-[#F4A833] h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm font-bold text-[#F4A833]">
              {t(`Step ${step} of 3`)}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Main Card Content */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            
            {/* STEP 1: SHOP SETUP */}
            {step === 1 && (
              <form id="shop-setup-form" onSubmit={handleShopSetup}>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] mb-6">{t('Tell us about your shop.')}</h2>

                <div className="space-y-6">
                  {/* Shop Name */}
                  <div>
                    <label className="block text-base font-semibold text-[#1A1A1A] mb-2">{t('Shop Name')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('Enter shop name')}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] outline-none transition-all bg-white text-base text-[#1A1A1A]"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>

                  {/* Shop Type */}
                  <div>
                    <label className="block text-base font-semibold text-[#1A1A1A] mb-2.5">{t('Shop Type')}</label>
                    <div className="flex flex-wrap gap-2.5">
                      {SHOP_TYPES.map((type) => {
                        const isSelected = shopType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setShopType(type)}
                            className={`px-4 py-2.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white shadow-sm' 
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {t(type)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location (Optional) */}
                  <div>
                    <label className="block text-base font-semibold text-[#1A1A1A] mb-2">{t('Location (Optional)')}</label>
                    <input
                      type="text"
                      placeholder={t('City or Area')}
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] outline-none transition-all bg-white text-base text-[#1A1A1A]"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: WORKING DAYS */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] mb-1">{t('When does your store operate?')}</h2>
                <p className="text-sm text-gray-500 mb-8">{t('This helps us track only your working days')}</p>

                {/* Working days pills */}
                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold transition-all text-sm cursor-pointer shadow-sm ${
                          isSelected 
                            ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white' 
                            : 'bg-white border-gray-300 text-[#1E3A5F] hover:border-[#1E3A5F]'
                        }`}
                      >
                        {t(day)}
                      </button>
                    );
                  })}
                </div>

                {/* Preset buttons */}
                <div className="flex gap-3 justify-center mb-4">
                  <button 
                    type="button"
                    onClick={setMonToSat}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 text-[#1A1A1A] rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {t('Mon - Sat')}
                  </button>
                  <button 
                    type="button"
                    onClick={setMonToSun}
                    className="px-4 py-2 bg-gray-100 border border-gray-200 text-[#1A1A1A] rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    {t('Mon - Sun')}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: ITEM SETUP */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] mb-1">{t('What do you sell?')}</h2>
                <p className="text-sm text-gray-500 mb-6">{t('Add your shop items and their sales goals')}</p>

                <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#1E3A5F]">{t('Item')} {index + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        required
                        placeholder={t('Item Name (e.g., Milk 1L)')}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:border-[#1E3A5F] focus:outline-none"
                        value={item.item_name}
                        onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder={t('Selling Price (₹)')}
                          className="px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:border-[#1E3A5F] focus:outline-none"
                          value={item.selling_price}
                          onChange={(e) => updateItem(item.id, 'selling_price', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder={t('Cost Price (₹) Opt.')}
                          className="px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:border-[#1E3A5F] focus:outline-none"
                          value={item.cost_price}
                          onChange={(e) => updateItem(item.id, 'cost_price', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          required
                          placeholder={t('Min Daily Target')}
                          className="px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:border-[#1E3A5F] focus:outline-none"
                          value={item.min_daily_target}
                          onChange={(e) => updateItem(item.id, 'min_daily_target', e.target.value)}
                        />
                        <input
                          type="number"
                          required
                          placeholder={t('Min Weekly Target')}
                          className="px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:border-[#1E3A5F] focus:outline-none"
                          value={item.min_weekly_target}
                          onChange={(e) => updateItem(item.id, 'min_weekly_target', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-3 mb-2 border-2 border-dashed border-[#F4A833] text-[#F4A833] rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-[#F4A833]/5 transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  {t('Add Another Item')}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer Navigation Bar (Matches App shop-setup.tsx footer) */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="flex-1 py-4 border border-gray-300 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-base"
          >
            <span>{t('Back')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (step === 1) handleShopSetup();
              else if (step === 2) handleWorkingDaysSetup();
              else if (step === 3) handleDone();
            }}
            disabled={loading}
            className="flex-[2] py-4 bg-[#1E3A5F] text-white rounded-xl font-bold hover:bg-[#1E3A5F]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 text-base"
          >
            <span>{loading ? t('Saving...') : step === 3 ? t('Done') : t('Next')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
