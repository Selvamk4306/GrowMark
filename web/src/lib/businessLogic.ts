import { supabase } from './supabase';

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
  _revenue_growth: number,
  profit_margin: number,
  target_achievement_rate: number,
  _expense_control: number
) => {
  const cap = (val: number) => Math.min(Math.max(val, 0), 100);
  const profit_score = cap((profit_margin / 20) * 100);
  
  const score = (cap(target_achievement_rate) * 0.50) 
              + (profit_score * 0.50);
              
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

export const ALERT_VARIATIONS: Record<string, Array<{ msg: string; action: string }>> = {
  'Dead Stock': [
    { msg: "Zero sales recorded for a full week (7 days). Item is in dead stock!", action: "Consider a clearance sale, liquidation, or item removal." },
    { msg: "No items sold across all 7 working days this week. Item in dead stock.", action: "Liquidate stock or bundle with top-selling products." },
    { msg: "Dead stock detected: 0 units sold over 7 consecutive days.", action: "Apply clearance discount (40%+ off) immediately." }
  ],
  'Critical': [
    { msg: "Weekly target missed by a large margin.", action: "Flash sale or social media promotion needed." },
    { msg: "Performance is critical. Sales are way below weekly expectations.", action: "Review local pricing and competitors." },
    { msg: "Urgent: Weekly target not met after 6+ working days.", action: "Implement a 'Buy 1 Get 1' offer today." }
  ],
  'Alert': [
    { msg: "Missed daily target for 3+ days straight.", action: "Slight price revision or combo offer." },
    { msg: "Sales trend is worrying. Targets not met recently.", action: "Place item at a more prominent location." },
    { msg: "Performance alert: Struggling to hit daily minimums.", action: "Small discount or limited-time deal." }
  ],
  'Warning': [
    { msg: "Daily target is missed.", action: "Check if customers are ignoring this item." },
    { msg: "Minor sales dip today. Just a warning.", action: "Monitor closely for the next 24 hours." },
    { msg: "Missed the mark today. Might be a temporary fluke.", action: "Ensure the item is well-stocked and visible." }
  ]
};

export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function runConsecutiveFailureDetection(ownerId: string, itemId: string, endDateStr: string) {
  const refDateStr = endDateStr || formatDate(new Date());
  const refDate = new Date(refDateStr + 'T00:00:00');

  const startDate = new Date(refDate);
  startDate.setDate(refDate.getDate() - 14);

  const { data: owner } = await supabase.from('owners').select('*').eq('id', ownerId).single();
  const workingDays = owner?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  await supabase
    .from('alerts')
    .delete()
    .eq('owner_id', ownerId)
    .lt('triggered_at', sevenDaysAgo.toISOString());

  const { data: leaves } = await supabase
    .from('shop_leaves')
    .select('leave_date')
    .eq('owner_id', ownerId)
    .gte('leave_date', formatDate(startDate))
    .lte('leave_date', refDateStr);

  const leaveDates = leaves ? leaves.map(l => l.leave_date) : [];

  const { data: item } = await supabase
    .from('items')
    .select('min_daily_target, min_weekly_target, item_name')
    .eq('id', itemId)
    .single();

  if (!item) return;

  const { data: sales } = await supabase
    .from('daily_sales')
    .select('sale_date, quantity_sold')
    .eq('item_id', itemId)
    .gte('sale_date', formatDate(startDate))
    .lte('sale_date', refDateStr)
    .order('sale_date', { ascending: false });

  if (!sales) return;

  let consecutiveMisses = 0;
  let totalMissesInWeek = 0;
  let zeroSalesDays = 0;
  let weeklyTotal = 0;
  let todayQty = 0;
  let workingDaysChecked = 0;
  let countingConsecutive = true;
  let countingZeroSales = true;
  let last3DaysSalesCount = 0;

  let currentDate = new Date(refDate);
  for (let i = 0; workingDaysChecked < 7 && i < 14; i++) {
    const curDateStr = formatDate(currentDate);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });

    if (!workingDays.includes(dayName) || leaveDates.includes(curDateStr)) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }

    const saleForDay = sales.find(s => s.sale_date === curDateStr);
    const qty = saleForDay ? Number(saleForDay.quantity_sold) || 0 : 0;

    if (workingDaysChecked === 0) {
      todayQty = qty;
    }

    weeklyTotal += qty;

    if (workingDaysChecked < 3 && qty > 0) {
      last3DaysSalesCount++;
    }

    if (qty === 0 && countingZeroSales) {
      zeroSalesDays++;
    } else {
      countingZeroSales = false;
    }

    if (qty < item.min_daily_target) {
      totalMissesInWeek++;
      if (countingConsecutive) {
        consecutiveMisses++;
      }
    } else {
      countingConsecutive = false;
    }

    workingDaysChecked++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  const todayMetTarget = todayQty >= item.min_daily_target;
  const weeklyMetTarget = weeklyTotal >= item.min_weekly_target;

  let calculatedLevel: 'Warning' | 'Alert' | 'Critical' | 'Dead Stock' | null = null;
  let customMsg = '';
  let customAction = '';

  if (zeroSalesDays >= 7) {
    calculatedLevel = 'Dead Stock';
    customMsg = `${item.item_name}: Zero sales recorded for a full week (7 days). Item is in dead stock!`;
    customAction = `Consider a clearance sale, liquidation, or item removal.`;
  } else if (!todayMetTarget) {
    if (consecutiveMisses >= 6) {
      // Only pop up "Weekly target missed by a large margin" after 6 consecutive days of missing daily target
      calculatedLevel = 'Critical';
      customMsg = `${item.item_name}: Weekly target missed by a large margin.`;
      customAction = `Flash sale or social media promotion needed.`;
    } else if (consecutiveMisses >= 3) {
      // 3 or more consecutive misses trigger Critical
      calculatedLevel = 'Critical';
      customMsg = `${item.item_name}: Daily target missed for ${consecutiveMisses} consecutive days.`;
      customAction = `Flash sale or social media promotion needed.`;
    } else if (totalMissesInWeek >= 5) {
      // 5 or more misses in a week trigger Warning
      calculatedLevel = 'Warning';
      customMsg = `${item.item_name}: Daily target missed 5 times this week.`;
      customAction = `Check if customers are ignoring this item.`;
    } else {
      // 1 or 2 misses trigger Warning with "Daily target is missed."
      calculatedLevel = 'Warning';
      customMsg = `${item.item_name}: Daily target is missed.`;
      customAction = `Check if customers are ignoring this item.`;
    }
  }

  const { data: activeAlerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('item_id', itemId)
    .eq('is_read', false);

  const resolveAllAlerts = async () => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('item_id', itemId)
      .eq('is_read', false);
  };

  if (todayMetTarget) {
    if (activeAlerts && activeAlerts.length > 0) {
      const hasDeadStock = activeAlerts.some(a => a.alert_level === 'Dead Stock');
      if (hasDeadStock) {
        if (last3DaysSalesCount >= 3) {
          await resolveAllAlerts();
        }
      } else {
        await resolveAllAlerts();
      }
    }
    return;
  }

  if (calculatedLevel && customMsg) {
    const message = customMsg;
    const action = customAction;

    if (activeAlerts && activeAlerts.length > 0) {
      const existingAlert = activeAlerts[0];
      const extraAlertIds = activeAlerts.slice(1).map(a => a.id);

      await supabase.from('alerts').update({
        alert_level: calculatedLevel,
        alert_message: message,
        days_missed: consecutiveMisses,
        suggested_action: action,
        triggered_at: new Date().toISOString()
      }).eq('id', existingAlert.id);

      if (extraAlertIds.length > 0) {
        await supabase.from('alerts').update({ is_read: true }).in('id', extraAlertIds);
      }
    } else {
      await supabase.from('alerts').insert({
        owner_id: ownerId,
        item_id: itemId,
        alert_level: calculatedLevel,
        alert_message: message,
        days_missed: consecutiveMisses,
        suggested_action: action,
        is_read: false,
        triggered_at: new Date().toISOString()
      });
    }
  } else {
    await resolveAllAlerts();
  }
}

export async function calculateBusinessHealthScore(ownerId: string, weekStartDateStr: string) {
  try {
    const { data: owner } = await supabase.from('owners').select('*').eq('id', ownerId).single();
    const workingDays = owner?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const weekStart = new Date(weekStartDateStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);

    const { data: leaves } = await supabase
      .from('shop_leaves')
      .select('leave_date')
      .eq('owner_id', ownerId)
      .gte('leave_date', formatDate(weekStart))
      .lte('leave_date', formatDate(weekEnd));

    const leaveDates = leaves ? leaves.map(l => l.leave_date) : [];

    const { data: currentSales, error: salesError } = await supabase
      .from('daily_sales')
      .select('quantity_sold, total_revenue, total_profit, items!inner(min_daily_target, cost_price)')
      .eq('owner_id', ownerId)
      .gte('sale_date', formatDate(weekStart))
      .lte('sale_date', formatDate(weekEnd));

    if (salesError) throw salesError;

    const { data: prevSales } = await supabase
      .from('daily_sales')
      .select('total_revenue')
      .eq('owner_id', ownerId)
      .gte('sale_date', formatDate(prevWeekStart))
      .lte('sale_date', formatDate(prevWeekEnd));

    const { count: itemCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);

    const totalItems = itemCount || 0;
    
    let leaveDatesInWorkingDays = 0;
    leaveDates.forEach(ld => {
      const d = new Date(ld);
      if (workingDays.includes(d.toLocaleDateString('en-US', { weekday: 'short' }))) {
        leaveDatesInWorkingDays++;
      }
    });
    
    const activeWorkingDaysCount = Math.max(1, workingDays.length - leaveDatesInWorkingDays);
    const denominator = totalItems * activeWorkingDaysCount;

    let target_achievement_rate = 0;
    if (denominator > 0 && currentSales && currentSales.length > 0) {
      const achievementsSum = currentSales.reduce((sum, s: any) => {
        const item = Array.isArray(s.items) ? s.items[0] : s.items;
        const target = item?.min_daily_target || 0;
        const qty = s.quantity_sold || 0;

        if (target <= 0) return sum + 100;
        const achievement = Math.min(100, (qty / target) * 100);
        return sum + achievement;
      }, 0);
      target_achievement_rate = Math.min(100, Math.max(0, achievementsSum / denominator));
    }

    let revenue_growth = 0;
    const thisWeekRev = currentSales?.reduce((acc, s: any) => acc + (Number(s.total_revenue) || 0), 0) || 0;
    const prevWeekRev = prevSales?.reduce((acc, s: any) => acc + (Number(s.total_revenue) || 0), 0) || 0;

    if (prevWeekRev === 0 && thisWeekRev === 0) {
      revenue_growth = 0;
    } else if (prevWeekRev === 0 && thisWeekRev > 0) {
      revenue_growth = 50;
    } else {
      revenue_growth = (thisWeekRev / prevWeekRev) * 100;
    }
    revenue_growth = Math.min(100, Math.max(0, revenue_growth));

    let profit_margin = 0;
    const totalRev = thisWeekRev;
    const totalProf = currentSales?.reduce((acc, s: any) => {
      const rev = Number(s.total_revenue) || 0;
      const qty = Number(s.quantity_sold) || 0;
      const item = Array.isArray(s.items) ? s.items[0] : s.items;

      let finalProf = 0;
      if (s.total_profit !== null && s.total_profit !== undefined && Number(s.total_profit) !== 0) {
        finalProf = Number(s.total_profit);
      } else if (item) {
        finalProf = rev - (Number(item.cost_price || 0) * qty);
      }
      return acc + finalProf;
    }, 0) || 0;

    if (totalRev > 0) {
      profit_margin = (totalProf / totalRev) * 100;
    } else if (totalProf > 0) {
      profit_margin = 100;
    }
    profit_margin = Math.min(100, Math.max(0, profit_margin));

    const profit_score = Math.min(100, (profit_margin / 20) * 100);
    const expense_control = 100;

    const score = (target_achievement_rate * 0.50) + (profit_score * 0.50);
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    const { error: upsertError } = await supabase
      .from('health_scores')
      .upsert({
        owner_id: ownerId,
        week_start_date: weekStartDateStr,
        score: finalScore,
        revenue_growth,
        profit_margin,
        target_achievement_rate,
        expense_control,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'owner_id,week_start_date'
      });

    if (upsertError) {
      const { data: existing } = await supabase
        .from('health_scores')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('week_start_date', weekStartDateStr)
        .maybeSingle();

      const scoreData = {
        score: finalScore,
        revenue_growth,
        profit_margin,
        target_achievement_rate,
        expense_control,
        created_at: new Date().toISOString()
      };

      if (existing) {
        await supabase.from('health_scores').update(scoreData).eq('id', existing.id);
      } else {
        await supabase.from('health_scores').insert({
          owner_id: ownerId,
          week_start_date: weekStartDateStr,
          ...scoreData
        });
      }
    }
    return finalScore;
  } catch (err) {
    console.error('Error calculating health score:', err);
  }
}
