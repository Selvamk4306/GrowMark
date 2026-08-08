import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Store, 
  LogOut, 
  Package, 
  Globe, 
  ChevronRight, 
  Mail, 
  MapPin,
  X,
  Languages
} from 'lucide-react';

const LANGUAGES = [
  { label: 'English', native: 'English' },
  { label: 'Tamil', native: 'தமிழ்' },
  { label: 'Hindi', native: 'हिन्दी' },
  { label: 'Telugu', native: 'తెలుగు' },
  { label: 'Kannada', native: 'ಕನ್ನಡ' },
  { label: 'Malayalam', native: 'മലയാളം' },
];

export function Profile() {
  const { session, owner, signOut, refreshOwner } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);

  const [formData, setFormData] = useState({
    username: owner?.username || session?.user?.user_metadata?.username || '',
    shop_name: owner?.shop_name || 'My Store',
    shop_type: owner?.shop_type || 'Retail',
    location: owner?.location || '',
  });

  useEffect(() => {
    if (owner) {
      setFormData({
        username: owner.username || '',
        shop_name: owner.shop_name || '',
        shop_type: owner.shop_type || 'Retail',
        location: owner.location || '',
      });
    }
  }, [owner]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: formData.username }
      });

      if (authError) throw authError;

      if (owner?.id && session?.user?.id) {
        const { error: ownerError } = await supabase
          .from('owners')
          .update({
            username: formData.username,
            shop_name: formData.shop_name,
            shop_type: formData.shop_type,
            location: formData.location
          })
          .eq('id', owner.id);

        if (ownerError) throw ownerError;
        await refreshOwner(session.user.id);
      }

      setMessage(t('Profile updated successfully!'));
      setIsEditing(false);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getWorkingDaysString = () => {
    if (!owner?.working_days) return t('N/A');
    if (Array.isArray(owner.working_days)) {
      return owner.working_days.join(', ');
    }
    return String(owner.working_days);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary mb-4">{t('Profile')}</h1>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-semibold ${message.includes('Error') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
          {message}
        </div>
      )}

      {isEditing ? (
        /* EDIT PROFILE FORM VIEW */
        <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-primary">{t('Edit Profile')}</h2>
            <button 
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg hover:bg-background text-textSecondary hover:text-textPrimary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wider">{t('Full Name')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wider">{t('Shop Name')}</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                <input 
                  type="text" 
                  value={formData.shop_name}
                  onChange={e => setFormData({...formData, shop_name: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm" 
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wider">{t('Shop Type')}</label>
              <select
                value={formData.shop_type}
                onChange={e => setFormData({...formData, shop_type: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm bg-white"
              >
                <option value="Grocery">{t('Grocery')}</option>
                <option value="Food and Beverage">{t('Food and Beverage')}</option>
                <option value="Salon">{t('Salon')}</option>
                <option value="Pharmacy">{t('Pharmacy')}</option>
                <option value="Clothing">{t('Clothing')}</option>
                <option value="Hardware">{t('Hardware')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 uppercase tracking-wider">{t('Location')}</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border focus:border-primary outline-none text-sm" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-sm shadow-md mt-2"
            >
              {loading ? t('Updating...') : t('Save Changes')}
            </button>
          </form>
        </div>
      ) : (
        /* READ-ONLY MOBILE-STYLE VIEW */
        <div className="space-y-6">
          
          {/* Top Profile Card Header */}
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center">
            
            {/* Avatar Circle */}
            <div className="w-20 h-20 bg-accent text-white rounded-full flex items-center justify-center text-3xl font-extrabold border-4 border-white shadow-lg">
              {formData.username ? formData.username.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* User details */}
            <h2 className="text-xl font-black text-primary mt-4">{formData.username}</h2>
            <p className="text-textSecondary text-xs sm:text-sm flex items-center mt-1">
              <Mail className="w-3.5 h-3.5 mr-1 text-textSecondary" />
              {session?.user?.email || 'email@gmail.com'}
            </p>

            {/* Edit Profile outline button */}
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 px-5 py-1.5 border border-[#F4A833] text-[#F4A833] rounded-full text-xs font-bold hover:bg-[#F4A833]/5 active:scale-95 transition-all"
            >
              {t('Edit Profile')}
            </button>

          </div>

          {/* Store Details Details Box */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm divide-y divide-border/60">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-semibold text-textSecondary">{t('Shop Name')}</span>
              <span className="text-sm font-bold text-primary">{owner?.shop_name || t('N/A')}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-semibold text-textSecondary">{t('Shop Type')}</span>
              <span className="text-sm font-bold text-primary">{owner?.shop_type || t('N/A')}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-semibold text-textSecondary">{t('Working Days')}</span>
              <span className="text-sm font-bold text-primary">{getWorkingDaysString()}</span>
            </div>
          </div>

          {/* Settings Section (Manage Items, Language) */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold text-textSecondary pl-2 uppercase tracking-widest">{t('Settings')}</h3>
            
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/60">
              
              {/* Manage Items List Row */}
              <div 
                onClick={() => navigate('/items')}
                className="flex justify-between items-center p-4 hover:bg-background/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/5 text-primary">
                    <Package className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-primary">{t('Manage Items')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-textSecondary" />
              </div>

              {/* Language Switcher List Row */}
              <div 
                onClick={() => setShowLangModal(true)}
                className="flex justify-between items-center p-4 hover:bg-background/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/5 text-primary">
                    <Languages className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-primary">{t('Language')}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-textSecondary" />
              </div>

            </div>
          </div>

          {/* Outline Logout Button */}
          <button 
            onClick={() => signOut()}
            className="w-full py-3 border-2 border-danger/35 text-danger rounded-2xl font-bold bg-white hover:bg-danger/5 transition-all text-center text-sm shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('Logout')}
          </button>

        </div>
      )}

      {/* LANGUAGE SELECTOR MODAL */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowLangModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-background text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <Globe className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-bold text-primary">{t('Language Settings')}</h3>
            </div>

            <p className="text-xs text-textSecondary mb-4">
              {t('Select your preferred interface language:')}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-2 max-h-56 overflow-y-auto pr-1">
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.label;
                return (
                  <button
                    key={lang.label}
                    onClick={() => {
                      setLanguage(lang.label);
                      setShowLangModal(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-accent bg-accent/5 ring-1 ring-accent font-semibold' 
                        : 'border-border hover:border-textSecondary hover:bg-background'
                    }`}
                  >
                    <div className="text-xs sm:text-sm text-primary">{lang.native}</div>
                    <div className="text-[10px] text-textSecondary">{lang.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
