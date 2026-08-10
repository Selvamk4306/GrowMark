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

export const INSIGHT_VARIATIONS: Record<string, Array<{ title: string; desc: string }>> = {
  'Revenue Drop': [
    { title: 'Revenue Slip', desc: 'Your weekly revenue dropped. Consider a weekend promotion.' },
    { title: 'Sales Slowdown', desc: 'Sales are lower than last week. Time to re-engage customers.' },
    { title: 'Income Alert', desc: 'A revenue dip was detected. Review your pricing strategy.' }
  ],
  'Low Margin': [
    { title: 'Profit Squeeze', desc: 'Margins are thin. Check supplier costs or raise prices.' },
    { title: 'Thin Margins', desc: 'Your profit per sale is low. Consider bulk buying for better rates.' },
    { title: 'Margin Boost', desc: 'Profit margins dropped. Optimize your overhead expenses.' }
  ],
  'Combo': [
    { title: 'Combo Potential', desc: 'Boost sales by bundling items that are missing targets.' },
    { title: 'Bundle & Save', desc: 'Create a "Smart Bundle" with under-performing items.' },
    { title: 'Mix & Match', desc: 'A combo offer could revive interest in slow-moving stock.' }
  ],
  'Default': [
    { title: 'Keep It Up!', desc: 'Your business metrics look healthy. Stay focused on growth!' },
    { title: 'Steady Growth', desc: 'Solid performance this week. Can you push it even further?' },
    { title: 'Business in Bloom', desc: 'Everything looks green. A great time to plan for expansion.' }
  ]
};
