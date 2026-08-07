import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export function TermsOfUse() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-background border border-border rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-primary">{t('Terms of Use')}</h1>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-textPrimary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-primary mb-3">1. Acceptance of Terms</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            By accessing and using the GrowMark application, you agree to be bound by these Terms of Use and all applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">2. Use License</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            GrowMark is provided as a decision support tool for small business owners. You are granted a limited license to use the app for your internal business monitoring.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">3. Accuracy of Data</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            The accuracy of health scores and reports depends entirely on the accuracy of the sales data you enter. GrowMark is not responsible for business decisions made based on incorrect data entry.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">4. Disclaimer</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            GrowMark is provided "as is". We make no warranties regarding the specific outcomes of your business performance. The health score is a mathematical model and should be one of many factors in your decision-making.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">5. Limitations</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            In no event shall GrowMark be liable for any damages arising out of the use or inability to use the application.
          </p>
        </section>
      </div>
    </div>
  );
}
