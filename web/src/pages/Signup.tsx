import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { User, Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useTranslation();

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError(t('Please fill in all fields.'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match.'));
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: fullName,
        }
      }
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else if (data.user) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#2D5A8E] to-[#1A3055] text-white flex flex-col justify-between py-6 px-4 select-none">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        
        {/* Top Header Bar */}
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10.5 h-10.5 rounded-full bg-white/12 border border-white/20 flex items-center justify-center text-white/90 hover:bg-white/20 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Top Section - Logo & Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg ring-2 ring-white/10">
            <img src="/splash-icon.png" alt="GrowMark Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">GrowMark</h1>
          <p className="text-sm text-white/50 mt-1">{t('Join thousands of shop owners')}</p>
        </div>

        {/* Form Section */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white mb-1">{t('Create account')}</h2>
          <p className="text-sm text-white/50 mb-6">{t('Start your free journey today')}</p>

          {error && (
            <div className="bg-red-500/20 text-red-200 p-3.5 rounded-xl mb-5 text-sm border border-red-500/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                {t('Full Name')}
              </label>
              <div className="flex items-center bg-white/12 border-[1.5px] border-white/25 rounded-xl px-3.5 py-3 text-white focus-within:border-[#F4A833] focus-within:bg-[#F4A833]/10 transition-all shadow-inner">
                <User className="w-4 h-4 text-white/70 mr-3 shrink-0" />
                <input
                  type="text"
                  required
                  placeholder={t('Enter your full name')}
                  className="w-full bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-normal"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

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
                  placeholder={t('Create a password')}
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                {t('Confirm Password')}
              </label>
              <div className="flex items-center bg-white/12 border-[1.5px] border-white/25 rounded-xl px-3.5 py-3 text-white focus-within:border-[#F4A833] focus-within:bg-[#F4A833]/10 transition-all shadow-inner">
                <ShieldCheck className="w-4 h-4 text-white/70 mr-3 shrink-0" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder={t('Confirm your password')}
                  className="w-full bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-normal"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/70 hover:text-white transition-colors ml-2 focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-base mt-2 cursor-pointer border border-white/10"
            >
              {loading ? t('Updating...') : t('Create Account')}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-7 text-center text-sm text-white/50">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="text-[#F4A833] font-bold hover:underline ml-1">
              {t('Login')}
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
