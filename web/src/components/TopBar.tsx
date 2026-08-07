import { Menu, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { owner } = useAuth();

  const getInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const initials = getInitials(owner?.username || owner?.shop_name);

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 mr-2 text-textSecondary hover:bg-background rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-primary md:hidden">Grow<span className="text-accent">Mark</span></h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-textSecondary hover:bg-background rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-semibold hover:bg-accent/90 transition-colors cursor-pointer"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
