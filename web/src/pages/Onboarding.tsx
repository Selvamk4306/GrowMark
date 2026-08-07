import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Languages, 
  Store, 
  Calendar, 
  PackagePlus, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

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
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
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

  // Step 0 Continue: Save Lang preference and proceed
  const handleLangContinue = () => {
    localStorage.setItem('has_selected_language', 'true');
    setStep(1);
  };

  // Step 1 Continue: Create Owner profile
  const handleShopSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !shopType) {
      setError(t('Shop Name and Shop Type are required.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const username = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Owner';
      
      // Check if owner already exists
      const { data: existingOwner } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', session.user.id)
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
              user_id: session.user.id,
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
      let activeOwnerId = ownerId;
      if (!activeOwnerId) {
        const { data: currentOwner } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', session.user.id)
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
      let activeOwnerId = ownerId;
      if (!activeOwnerId) {
        const { data: currentOwner } = await supabase
          .from('owners')
          .select('id')
          .eq('user_id', session.user.id)
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
      await refreshOwner(session.user.id);
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

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 translate-x-1/2 translate-y-1/2" />

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-auto">
        
        {/* Step Progress Indicators */}
        <div className="mb-8 flex items-center justify-between px-2">
          {[
            { label: t('Language'), icon: Languages },
            { label: t('Shop'), icon: Store },
            { label: t('Days'), icon: Calendar },
            { label: t('Items'), icon: PackagePlus }
          ].map((item, idx) => {
            const Icon = item.icon;
            const isCompleted = idx < step;
            const isActive = idx === step;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 relative">
                {/* Connecting Line */}
                {idx > 0 && (
                  <div className={`absolute top-5 right-1/2 left-[-50%] h-0.5 -z-10 transition-colors duration-500 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                )}
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shadow-sm ${
                  isCompleted ? 'bg-primary border-primary text-white' : 
                  isActive ? 'bg-white border-accent text-accent scale-110 ring-4 ring-accent/10' : 
                  'bg-white border-border text-textSecondary'
                }`}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-semibold mt-2 transition-colors duration-300 ${isActive ? 'text-primary' : 'text-textSecondary'}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Card Component */}
        <div className="glass p-6 sm:p-8 rounded-2xl shadow-xl hover-lift bg-white/95 border border-white/40">
          
          {/* STEP 0: LANGUAGE SELECT */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2 text-center">{t('Choose your language')}</h2>
              <p className="text-sm text-textSecondary text-center mb-8">{t('You can change this anytime in settings')}</p>

              <div className="grid grid-cols-2 gap-4 mb-8 max-h-[300px] overflow-y-auto pr-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.label;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.label)}
                      className={`p-4 rounded-xl border text-left transition-all duration-300 flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'border-accent bg-accent/5 shadow-sm shadow-accent/5 ring-1 ring-accent' 
                          : 'border-border hover:border-textSecondary hover:bg-background'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-primary text-sm sm:text-base">{lang.native}</div>
                        <div className="text-xs text-textSecondary">{lang.label}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-accent bg-accent text-white' : 'border-border bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleLangContinue}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20"
              >
                {t('Continue')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 1: SHOP SETUP */}
          {step === 1 && (
            <form onSubmit={handleShopSetup}>
              <h2 className="text-2xl font-bold text-primary mb-2">{t('Tell us about your shop.')}</h2>
              <p className="text-sm text-textSecondary mb-6">{t('Step 1 of 3')}</p>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">{t('Shop Name')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('Enter shop name')}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">{t('Shop Type')}</label>
                  <div className="flex flex-wrap gap-2.5">
                    {SHOP_TYPES.map((type) => {
                      const isSelected = shopType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setShopType(type)}
                          className={`px-4 py-2 rounded-full border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/10' 
                              : 'bg-white border-border text-textSecondary hover:border-textSecondary'
                          }`}
                        >
                          {t(type)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">{t('Location (Optional)')}</label>
                  <input
                    type="text"
                    placeholder={t('City or Area')}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex-1 py-3.5 border border-border text-textSecondary rounded-xl font-bold hover:bg-background transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('Back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20 disabled:opacity-55"
                >
                  {loading ? t('Saving...') : t('Next')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: WORKING DAYS */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">{t('When does your store operate?')}</h2>
              <p className="text-sm text-textSecondary mb-6">{t('This helps us track only your working days')}</p>

              {/* Working days pills */}
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold transition-all text-sm cursor-pointer ${
                        isSelected 
                          ? 'bg-primary border-primary text-white shadow-md shadow-primary/10' 
                          : 'bg-white border-border text-primary hover:border-primary'
                      }`}
                    >
                      {t(day)}
                    </button>
                  );
                })}
              </div>

              {/* Preset buttons */}
              <div className="flex gap-4 justify-center mb-8">
                <button 
                  onClick={setMonToSat}
                  className="px-4 py-2 bg-border text-textPrimary rounded-lg text-sm font-semibold hover:bg-border/80 transition-colors cursor-pointer"
                >
                  {t('Mon - Sat')}
                </button>
                <button 
                  onClick={setMonToSun}
                  className="px-4 py-2 bg-border text-textPrimary rounded-lg text-sm font-semibold hover:bg-border/80 transition-colors cursor-pointer"
                >
                  {t('Mon - Sun')}
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 border border-border text-textSecondary rounded-xl font-bold hover:bg-background transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('Back')}
                </button>
                <button
                  onClick={handleWorkingDaysSetup}
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20 disabled:opacity-55"
                >
                  {loading ? t('Saving...') : t('Next')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ITEM SETUP */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">{t('What do you sell?')}</h2>
              <p className="text-sm text-textSecondary mb-6">{t('Add your shop items and their sales goals')}</p>

              <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-xl border border-border bg-background/50 relative space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-primary">{t('Item')} {index + 1}</span>
                      {items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-textSecondary hover:text-danger rounded-md hover:bg-danger/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder={t('Item Name (e.g., Milk 1L)')}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm focus:border-primary focus:outline-none"
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder={t('Selling Price (₹)')}
                        className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:border-primary focus:outline-none"
                        value={item.selling_price}
                        onChange={(e) => updateItem(item.id, 'selling_price', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder={t('Cost Price (₹) Opt.')}
                        className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:border-primary focus:outline-none"
                        value={item.cost_price}
                        onChange={(e) => updateItem(item.id, 'cost_price', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        required
                        placeholder={t('Min Daily Target')}
                        className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:border-primary focus:outline-none"
                        value={item.min_daily_target}
                        onChange={(e) => updateItem(item.id, 'min_daily_target', e.target.value)}
                      />
                      <input
                        type="number"
                        required
                        placeholder={t('Min Weekly Target')}
                        className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:border-primary focus:outline-none"
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
                className="w-full py-3 mb-6 border-2 border-dashed border-accent text-accent rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-accent/5 hover:border-accent/80 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                {t('Add Another Item')}
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3.5 border border-border text-textSecondary rounded-xl font-bold hover:bg-background transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('Back')}
                </button>
                <button
                  onClick={handleDone}
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/95 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20 disabled:opacity-55"
                >
                  {loading ? t('Saving...') : t('Done')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
