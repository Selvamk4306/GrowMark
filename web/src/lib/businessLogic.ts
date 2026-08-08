export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getStartOfWeek = (refDate: Date) => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const calculateHealthScore = (
  revenue_growth: number,
  profit_margin: number,
  target_achievement_rate: number,
  expense_control: number
) => {
  const cap = (val: number) => Math.min(Math.max(val, 0), 100);
  
  const score = (cap(revenue_growth) * 0.30) 
              + (cap(profit_margin) * 0.30) 
              + (cap(target_achievement_rate) * 0.20) 
              + (cap(expense_control) * 0.20);
              
  return Math.round(score);
};

export const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString('en-IN')}`;
};

export const getHealthVerdict = (score: number) => {
  if (score >= 80) return { color: 'text-success', message: 'Excellent Business Health' };
  if (score >= 50) return { color: 'text-warning', message: 'Needs Improvement in some areas' };
  return { color: 'text-danger', message: 'Critical Action Required' };
};
