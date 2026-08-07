import { useEffect, useState } from 'react';
import { Lightbulb, PackageMinus, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { translateDynamic } from '../lib/translationService';

export function GrowthTips() {
  const { t, language } = useTranslation();
  const [translatedTips, setTranslatedTips] = useState<any[]>([]);

  const tips = [
    {
      id: 1,
      icon: <PackageMinus className="text-warning w-6 h-6" />,
      title: "Dead Stock Identified",
      description: "Sugar 1kg hasn't sold in 7 days. Consider a combo offer with fast-moving items or a minor discount to clear inventory.",
      color: "border-l-warning"
    },
    {
      id: 2,
      icon: <TrendingUp className="text-success w-6 h-6" />,
      title: "High Demand Alert",
      description: "Premium Rice consistently exceeds daily targets. We recommend increasing your minimum daily target and stock levels.",
      color: "border-l-success"
    },
    {
      id: 3,
      icon: <DollarSign className="text-primary w-6 h-6" />,
      title: "Profit Margin Check",
      description: "Your overall profit margin dropped below 20%. Consider reviewing supplier costs or adjusting selling prices slightly.",
      color: "border-l-primary"
    }
  ];

  useEffect(() => {
    async function translateAll() {
      const results = await Promise.all(tips.map(async (tip) => {
        const title = await translateDynamic(tip.title, language);
        const description = await translateDynamic(tip.description, language);
        return { ...tip, title, description };
      }));
      setTranslatedTips(results);
    }
    translateAll();
  }, [language]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t("This Week's Insights")}</h1>
          <p className="text-textSecondary">{t('Actionable insights to boost your business')}</p>
        </div>
        <div className="p-3 bg-accent/10 rounded-xl">
          <Lightbulb className="w-8 h-8 text-accent" />
        </div>
      </div>

      <div className="space-y-4">
        {translatedTips.map(tip => (
          <div key={tip.id} className={`glass p-6 rounded-xl border-l-4 ${tip.color} hover-lift`}>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-background rounded-xl">
                {tip.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-textPrimary mb-1">{tip.title}</h3>
                <p className="text-textSecondary leading-relaxed">{tip.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
