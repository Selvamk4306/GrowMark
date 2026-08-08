import { NavLink } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Home, 
  Receipt, 
  Bell, 
  BarChart2, 
  User 
} from 'lucide-react';

export function BottomNav() {
  const { t } = useTranslation();

  const navItems = [
    { name: t('Home'), path: '/', icon: Home },
    { name: t('Sales'), path: '/sales', icon: Receipt },
    { name: t('Alerts'), path: '/alerts', icon: Bell },
    { name: t('Reports'), path: '/reports', icon: BarChart2 },
    { name: t('Profile'), path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border h-16 flex items-center justify-around px-2 shadow-lg">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors
            ${isActive ? 'text-[#F4A833]' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <item.icon className="w-5 h-5 mb-1" />
          <span>{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
