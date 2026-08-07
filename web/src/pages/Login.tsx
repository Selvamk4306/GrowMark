import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useTranslation();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass p-8 rounded-2xl w-full max-w-md hover-lift">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Grow<span className="text-accent">Mark</span></h1>
          <p className="text-textSecondary mt-2">{t('Sign in to continue')}</p>
        </div>

        {error && <div className="bg-danger/10 text-danger p-3 rounded-lg mb-6 text-sm border border-danger/20">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">{t('Email')}</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white/50 focus:bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">{t('Password')}</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white/50 focus:bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 mt-2 shadow-md shadow-primary/20"
          >
            {loading ? t('Updating...') : t('Login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-textSecondary">
          {t("Don't have an account?")} <Link to="/signup" className="text-accent font-semibold hover:underline">{t('Sign up')}</Link>
        </p>
      </div>
    </div>
  );
}
