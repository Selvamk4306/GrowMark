import { NavLink } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { 
  LayoutDashboard, 
  Receipt, 
  Bell, 
  BarChart2, 
  Lightbulb, 
  User, 
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { name: t('Home'), path: '/', icon: LayoutDashboard },
    { name: t('Sales Entry'), path: '/sales', icon: Receipt },
    { name: t('Alerts'), path: '/alerts', icon: Bell },
    { name: t('Reports'), path: '/reports', icon: BarChart2 },
    { name: t('Profile'), path: '/profile', icon: User },
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
              onClick={() => signOut()}
              className="flex w-full items-center px-4 py-2 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 mr-3 shrink-0" />
              {t('Logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
