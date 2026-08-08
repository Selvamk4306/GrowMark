import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function TopBar() {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = owner?.username || owner?.shop_name || '';
  const initials = getInitials(displayName);

  return (
    <header className="h-16 bg-[#1E3A5F] bg-gradient-to-r from-[#1E3A5F] to-[#11243C] text-white border-b border-white/10 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-md">
      <div className="flex flex-col leading-tight">
        <span className="text-base sm:text-lg font-bold text-white tracking-wide">
          {getGreeting()}, {displayName || 'Owner'}
        </span>
        <span className="text-xs text-blue-200/80">Track your business performance in real-time</span>
      </div>

      <button
        onClick={() => navigate('/profile')}
        className="w-10 h-10 rounded-full bg-[#F4A833] flex items-center justify-center text-white font-bold hover:bg-[#F4A833]/90 transition-colors cursor-pointer shrink-0 shadow-sm border border-white/20"
      >
        {initials}
      </button>
    </header>
  );
}
