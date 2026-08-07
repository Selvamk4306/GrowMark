import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({ title, value, icon, trend, trendUp }: MetricCardProps) {
  return (
    <div className="glass p-6 rounded-xl hover-lift">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-textSecondary">{title}</h3>
        <div className="p-2 bg-background rounded-lg text-primary">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold text-textPrimary">{value}</h2>
        {trend && (
          <span className={`text-sm font-semibold ${trendUp ? 'text-success' : 'text-danger'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
    </div>
  );
}
