import { AlertCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface AlertCardProps {
  level: 'Warning' | 'Alert' | 'Critical' | 'Dead Stock';
  itemName: string;
  date: string;
  message: string;
  action: string;
}

export function AlertCard({ level, itemName, date, message, action }: AlertCardProps) {
  const getColors = () => {
    switch (level) {
      case 'Critical': return { border: 'border-l-danger', bg: 'bg-danger/10', icon: <XCircle className="text-danger w-5 h-5" />, text: 'text-danger' };
      case 'Alert': return { border: 'border-l-warning', bg: 'bg-warning/10', icon: <AlertTriangle className="text-warning w-5 h-5" />, text: 'text-warning' };
      case 'Warning': return { border: 'border-l-accent', bg: 'bg-accent/10', icon: <AlertCircle className="text-accent w-5 h-5" />, text: 'text-accent' };
      default: return { border: 'border-l-textSecondary', bg: 'bg-background', icon: <Info className="text-textSecondary w-5 h-5" />, text: 'text-textSecondary' };
    }
  };

  const colors = getColors();

  return (
    <div className={`glass p-4 rounded-xl border-l-4 ${colors.border} mb-3`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          {colors.icon}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
            {level}
          </span>
        </div>
        <span className="text-xs text-textSecondary">{date}</span>
      </div>
      <h4 className="font-semibold text-textPrimary mb-1">{itemName}</h4>
      <p className="text-sm text-textSecondary mb-3">{message}</p>
      <div className="bg-background rounded-lg p-2 text-xs font-medium text-primary border border-border">
        💡 Action: {action}
      </div>
    </div>
  );
}
