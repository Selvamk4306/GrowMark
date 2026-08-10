import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../context/LanguageContext';
import { Mail, Lock, Eye, EyeOff, Globe } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'Tamil' },
    { code: 'hi', label: 'Hindi' },
    { code: 'te', label: 'Telugu' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ml', label: 'Malayalam' },
  ];

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('Please enter both email and password.'));
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#2D5A8E] to-[#1A3055] text-white flex flex-col justify-between py-6 px-4 select-none">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        
        {/* Top Header Bar */}
        <div className="flex justify-start mb-4 relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/12 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition-all cursor-pointer shadow-sm"
          >
            <Globe className="w-4 h-4 text-[#F4A833]" />
            <span>{t('Language Preference')}</span>
          </button>

          {/* Language Dropdown */}
          {showLangMenu && (
            <div className="absolute top-11 left-0 bg-[#1E3A5F] border border-white/20 rounded-xl shadow-xl py-2 z-50 min-w-[150px]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.label);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                    language === lang.label ? 'text-[#F4A833] font-bold bg-white/10' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Section - Logo & Branding */}
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg ring-2 ring-white/10">
            <img src="/splash-icon.png" alt="GrowMark Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">GrowMark</h1>
          <p className="text-sm text-white/50 mt-1">{t('Track. Analyse. Grow.')}</p>
        </div>

        {/* Form Section */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white mb-1">{t('Welcome back')}</h2>
          <p className="text-sm text-white/50 mb-6">{t('Sign in to continue')}</p>

          {error && (
            <div className="bg-red-500/20 text-red-200 p-3.5 rounded-xl mb-5 text-sm border border-red-500/30">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                {t('Email address')}
              </label>
              <div className="flex items-center bg-white/12 border-[1.5px] border-white/25 rounded-xl px-3.5 py-3 text-white focus-within:border-[#F4A833] focus-within:bg-[#F4A833]/10 transition-all shadow-inner">
                <Mail className="w-4 h-4 text-white/70 mr-3 shrink-0" />
                <input
                  type="email"
                  required
                  placeholder={t('Enter your email')}
                  className="w-full bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-normal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                {t('Password')}
              </label>
              <div className="flex items-center bg-white/12 border-[1.5px] border-white/25 rounded-xl px-3.5 py-3 text-white focus-within:border-[#F4A833] focus-within:bg-[#F4A833]/10 transition-all shadow-inner">
                <Lock className="w-4 h-4 text-white/70 mr-3 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={t('Enter your password')}
                  className="w-full bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/70 hover:text-white transition-colors ml-2 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-base mt-2 cursor-pointer border border-white/10"
            >
              {loading ? t('Updating...') : t('Login')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/15" />
            <span className="px-3.5 text-xs text-white/40 font-medium">{t('or continue with')}</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-[#1E3A5F] font-semibold rounded-xl border border-[#1E3A5F] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-md"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-sm text-[#4285F4]">
              G
            </div>
            <span className="text-sm font-semibold">{t('Continue with Google')}</span>
          </button>

          {/* Sign Up Link */}
          <p className="mt-7 text-center text-sm text-white/50">
            {t("Don't have an account?")}{' '}
            <Link to="/signup" className="text-[#F4A833] font-bold hover:underline ml-1">
              {t('Sign up')}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
