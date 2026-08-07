import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Bell, 
  BarChart2, 
  Activity, 
  Lightbulb, 
  User, 
  Package, 
  Settings, 
  LogOut,
  CalendarDays,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { label: 'English', native: 'English' },
  { label: 'Tamil', native: 'தமிழ்' },
  { label: 'Hindi', native: 'हिन्दी' },
  { label: 'Telugu', native: 'తెలుగు' },
  { label: 'Kannada', native: 'ಕನ್ನಡ' },
  { label: 'Malayalam', native: 'മലയാളം' },
];

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const navItems = [
    { name: t('Dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('Daily Analysis'), path: '/daily-analysis', icon: CalendarDays },
    { name: t('Sales Entry'), path: '/sales', icon: Receipt },
    { name: t('Alerts'), path: '/alerts', icon: Bell },
    { name: t('Reports'), path: '/reports', icon: BarChart2 },
    { name: t('Health Score'), path: '/health', icon: Activity },
    { name: t('Growth Tips'), path: '/tips', icon: Lightbulb },
    { name: t('Manage Items'), path: '/items', icon: Package },
    { name: t('Profile'), path: '/profile', icon: User },
    { name: t('Privacy Policy'), path: '/privacy-policy', icon: ShieldCheck },
    { name: t('Terms of Use'), path: '/terms-of-use', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-border transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-center h-16 border-b border-border shrink-0">
            <h1 className="text-2xl font-bold text-primary">Grow<span className="text-accent">Mark</span></h1>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      flex items-center px-6 py-2.5 text-sm transition-colors
                      ${isActive 
                        ? 'bg-[#FEF3C7] text-primary font-bold border-l-4 border-accent' 
                        : 'text-textSecondary hover:bg-background hover:text-textPrimary border-l-4 border-transparent'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 mr-3 shrink-0" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-border shrink-0">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex w-full items-center px-4 py-2 text-sm text-textSecondary hover:bg-background hover:text-textPrimary rounded-xl transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5 mr-3 shrink-0" />
              {t('Settings')}
            </button>
            <button 
              onClick={() => signOut()}
              className="flex w-full items-center px-4 py-2 mt-2 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 mr-3 shrink-0" />
              {t('Logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* LANGUAGE/SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowSettingsModal(false)}
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
                    onClick={() => setLanguage(lang.label)}
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
    </>
  );
}
