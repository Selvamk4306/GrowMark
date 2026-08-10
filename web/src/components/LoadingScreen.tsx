import { useTranslation } from '../hooks/useTranslation';

export function LoadingScreen({ message }: { message?: string }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#1E3A5F] via-[#2D5A8E] to-[#1A3055] text-white flex flex-col justify-between items-center py-12 px-4 select-none">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Logo Container */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-5 shadow-2xl ring-2 ring-white/10 bg-[#FAF3E0] p-1 flex items-center justify-center">
          <img src="/splash-icon.png" alt="GrowMark Logo" className="w-full h-full object-contain rounded-xl" />
        </div>

        {/* App Title & Tagline */}
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">GrowMark</h1>
        <p className="text-base font-semibold text-[#F4A833] tracking-wide">
          {message || t('Monitor. Decide. Grow.')}
        </p>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="w-60 max-w-xs bg-white/20 h-1 rounded-full overflow-hidden mb-8 shadow-inner">
        <div className="h-full bg-[#F4A833] rounded-full animate-[loading_1.8s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
