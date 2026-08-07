import { getHealthVerdict } from '../lib/businessLogic';
import { useTranslation } from '../hooks/useTranslation';

interface HealthScoreCardProps {
  score: number;
  components: {
    revenue_growth: number;
    profit_margin: number;
    target_achievement: number;
    expense_control: number;
  };
}

export function HealthScoreCard({ score, components }: HealthScoreCardProps) {
  const { t } = useTranslation();
  const verdict = getHealthVerdict(score);
  
  // Translate verdict message if needed, or get standard label
  const getTranslatedVerdict = (score: number) => {
    if (score >= 80) return t('Healthy');
    if (score >= 50) return t('Work in Progress');
    return t('Needs Attention');
  };
  
  // SVG Ring calculation
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getRingColor = (score: number) => {
    if (score >= 80) return '#22C55E';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="glass p-6 rounded-xl">
      <h3 className="text-lg font-semibold mb-6 text-primary">{t('Business Health Score')}</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative flex flex-col items-center">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-border"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={getRingColor(score)}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="text-4xl font-bold text-primary">{score}</span>
            <span className="text-sm text-textSecondary block">/ 100</span>
          </div>
          <p className={`mt-4 font-semibold text-center ${verdict.color}`}>
            {getTranslatedVerdict(score)}
          </p>
        </div>

        <div className="flex-1 w-full space-y-4">
          <ProgressBar label={t('Revenue Growth')} value={components.revenue_growth} color="bg-success" />
          <ProgressBar label={t('Profit Margin')} value={components.profit_margin} color="bg-primary" />
          <ProgressBar label={t('Target Achievement')} value={components.target_achievement} color="bg-accent" />
          <ProgressBar label={t('Expense Control')} value={components.expense_control} color="bg-warning" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-textSecondary">{label}</span>
        <span className="text-xs font-bold text-textPrimary">{Math.round(value)}/100</span>
      </div>
      <div className="w-full bg-border rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(value, 100)}%` }}></div>
      </div>
    </div>
  );
}

