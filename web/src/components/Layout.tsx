import { Outlet, Navigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { session, owner, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!owner) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-24 max-w-[1600px] w-full mx-auto overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
