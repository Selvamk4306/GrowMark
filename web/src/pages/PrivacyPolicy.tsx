import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export function PrivacyPolicy() {
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
        <h1 className="text-2xl font-bold text-primary">{t('Privacy Policy')}</h1>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-textPrimary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-primary mb-3">1. Information We Collect</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            GrowMark collects business-related data such as sales figures, item names, and inventory targets. We also collect basic profile information like your shop name and username.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">2. How We Use Your Data</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            Your data is used exclusively to provide you with business health scores, alerts, and performance reports. We do not use your data for advertising or marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">3. Data Security</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            All data is transmitted securely and stored in encrypted databases. Access to your data is strictly limited to your authenticated session.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">4. Data Sharing</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            We do not share, sell, or rent your business data to any third parties. Your data is your property.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-primary mb-3">5. Your Rights</h2>
          <p className="text-textSecondary text-sm sm:text-base">
            You have the right to access, modify, or delete your business data at any time through the Manage Items and Profile settings.
          </p>
        </section>
      </div>
    </div>
  );
}
