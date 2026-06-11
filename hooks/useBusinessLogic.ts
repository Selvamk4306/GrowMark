import { supabase } from '../lib/supabase';

const ALERT_VARIATIONS = {
  'Dead Stock': [
    { msg: "Zero sales for 7 days. Move it or lose it!", action: "Consider a clearance sale or removal." },
    { msg: "This item is gathering dust. No sales in a week.", action: "Liquidate stock or bundle with best-sellers." },
    { msg: "Dead stock detected. Zero movement recently.", action: "Heavy discount (40%+) recommended." }
  ],
  'Critical': [
    { msg: "Weekly target missed by a large margin.", action: "Flash sale or social media promotion needed." },
    { msg: "Performance is critical. Sales are way below expectations.", action: "Review local pricing and competitors." },
    { msg: "Urgent: This item is failing to meet basic goals.", action: "Implement a 'Buy 1 Get 1' offer today." }
  ],
  'Alert': [
    { msg: "Missed daily target for 3+ days straight.", action: "Slight price revision or combo offer." },
    { msg: "Sales trend is worrying. Targets not met recently.", action: "Place item at a more prominent location." },
    { msg: "Performance alert: Struggling to hit daily minimums.", action: "Small discount or limited-time deal." }
  ],
  'Warning': [
    { msg: "Daily target missed. Keep an eye on it.", action: "Check if customers are ignoring this item." },
    { msg: "Minor sales dip today. Just a warning.", action: "Monitor closely for the next 24 hours." },
    { msg: "Missed the mark today. Might be a temporary fluke.", action: "Ensure the item is well-stocked and visible." }
  ]
};

export const INSIGHT_VARIATIONS = {
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

export const VERDICT_VARIATIONS = {
  'Healthy': ['Thriving', 'Elite Business', 'Market Leader', 'Healthy', 'Strong Performer'],
  'Needs Attention': ['Growing Pains', 'Needs Focus', 'Work in Progress', 'Stable', 'Potential to Improve'],
  'Poor Performer': ['Critical State', 'Urgent Action', 'Struggling', 'Under-performer', 'Risk Detected']
};

export function getScoreVerdict(score: number) {
  if (score >= 80) return 'Your Business is Thriving';
  if (score >= 50) return 'Work in Progress';
  return 'Immediate Action Needed';
}

function getRandomItem(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}



// Helper to get date string YYYY-MM-DD
export const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

export async function runThresholdCheck(ownerId: string, itemId: string, dateStr: string, quantitySold: number) {
  const { data: item } = await supabase.from('items').select('min_daily_target').eq('id', itemId).single();
  if (!item) return;

  const target = item.min_daily_target;
  let status = 'Met Target';
  if (quantitySold === 0) status = 'Zero Sales';
  else if (quantitySold < target) status = 'Below Target';

  return status;
}

export async function runConsecutiveFailureDetection(ownerId: string, itemId: string, endDateStr: string) {
  // Always evaluate alert status based on Today's date to ensure "Current Health"
  const today = formatDate(new Date());
  const endDate = new Date(today + 'T00:00:00');
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6); // Last 7 days from Today


  const { data: owner } = await supabase.from('owners').select('*').eq('id', ownerId).single();
  const workingDays = owner?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const { data: leaves } = await supabase
    .from('shop_leaves')
    .select('leave_date')
    .eq('owner_id', ownerId)
    .gte('leave_date', formatDate(startDate))
    .lte('leave_date', formatDate(endDate));

  const leaveDates = leaves ? leaves.map(l => l.leave_date) : [];

  const { data: item } = await supabase.from('items').select('min_daily_target, min_weekly_target, item_name').eq('id', itemId).single();
  if (!item) return;

  const { data: sales } = await supabase
    .from('daily_sales')
    .select('sale_date, quantity_sold')
    .eq('item_id', itemId)
    .gte('sale_date', formatDate(startDate))
    .lte('sale_date', formatDate(endDate))
    .order('sale_date', { ascending: false });


  if (!sales) return;

  let consecutiveMisses = 0;
  let weeklyTotal = 0;
  let zeroSalesDays = 0;
  let last3DaysMet = true;
  let last3DaysSalesCount = 0;
  let todayQty = 0;
  let workingDaysChecked = 0;

  // Since sales might be missing for some days, we should check calendar days.
  let currentDate = new Date(endDate);
  for (let i = 0; workingDaysChecked < 7 && i < 14; i++) {
    const curDateStr = formatDate(currentDate);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    if (!workingDays.includes(dayName)) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }

    if (leaveDates.includes(curDateStr)) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }

    const saleForDay = sales.find(s => s.sale_date === curDateStr);
    const qty = saleForDay ? saleForDay.quantity_sold : 0;

    weeklyTotal += qty;
    if (qty === 0) zeroSalesDays++;

    if (workingDaysChecked === 0) todayQty = qty;

    if (qty < item.min_daily_target) {
      if (workingDaysChecked === consecutiveMisses) consecutiveMisses++;
      if (workingDaysChecked < 3) last3DaysMet = false;
    }

    if (workingDaysChecked < 3 && qty > 0) {
      last3DaysSalesCount++;
    }

    workingDaysChecked++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  const todayMetTarget = todayQty >= item.min_daily_target;
  const weeklyMetTarget = weeklyTotal >= item.min_weekly_target;

  let calculatedLevel: 'Warning' | 'Alert' | 'Critical' | 'Dead Stock' | null = null;
  if (zeroSalesDays === 7) {
    calculatedLevel = 'Dead Stock';
  } else if (!weeklyMetTarget) {
    calculatedLevel = 'Critical';
  } else if (consecutiveMisses >= 3) {
    calculatedLevel = 'Alert';
  } else if (consecutiveMisses >= 1) {
    calculatedLevel = 'Warning';
  }

  // Fetch all active alerts for this item
  const { data: activeAlerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('item_id', itemId)
    .eq('is_read', false);

  if (activeAlerts && activeAlerts.length > 0) {
    // We take the most recent one to potentially update, and we'll handle the rest
    const existingAlert = activeAlerts[0];
    const otherAlertIds = activeAlerts.slice(1).map(a => a.id);

    const resolveAlerts = async () => {
      await supabase.from('alerts').update({ is_read: true }).eq('item_id', itemId).eq('is_read', false);
    };

    // 1. Dead Stock Clearing (3 consecutive days of sales > 0)
    if (existingAlert.alert_level === 'Dead Stock') {
      if (last3DaysSalesCount === 3) {
        await resolveAlerts();
        return;
      }
    }

    // 2. Weekly Target Clearing
    if (existingAlert.alert_level === 'Critical' && weeklyMetTarget) {
      await resolveAlerts();
      return;
    }

    // 3. Daily Performance Logic
    if (todayMetTarget) {
      if (existingAlert.alert_level === 'Warning') {
        // Warning -> Resolve all alerts for this item
        await resolveAlerts();
        return;
      } else if (existingAlert.alert_level === 'Alert') {
        // Alert -> Downgrade to Warning
        const variation = getRandomItem(ALERT_VARIATIONS['Warning']);
        await supabase.from('alerts').update({
          alert_level: 'Warning',
          alert_message: `${item.item_name}: ${variation.msg}`,
          suggested_action: variation.action,
          triggered_at: new Date().toISOString()
        }).eq('id', existingAlert.id);

        // Clean up duplicates
        if (otherAlertIds.length > 0) {
          await supabase.from('alerts').update({ is_read: true }).in('id', otherAlertIds);
        }
        return;
      } else if (existingAlert.alert_level === 'Critical') {
        // Critical -> Clear if last 3 days met, else Downgrade to Warning
        if (last3DaysMet) {
          await resolveAlerts();
        } else {
          const variation = getRandomItem(ALERT_VARIATIONS['Warning']);
          await supabase.from('alerts').update({
            alert_level: 'Warning',
            alert_message: `${item.item_name}: ${variation.msg}`,
            suggested_action: variation.action,
            triggered_at: new Date().toISOString()
          }).eq('id', existingAlert.id);

          // Clean up duplicates
          if (otherAlertIds.length > 0) {
            await supabase.from('alerts').update({ is_read: true }).in('id', otherAlertIds);
          }
        }
        return;
      }
    }

    // 4. Update if no clearing happened but level changed
    if (calculatedLevel) {
      const variation = getRandomItem(ALERT_VARIATIONS[calculatedLevel]);
      await supabase.from('alerts').update({
        alert_level: calculatedLevel,
        alert_message: `${item.item_name}: ${variation.msg}`,
        days_missed: consecutiveMisses,
        suggested_action: variation.action,
        triggered_at: new Date().toISOString()
      }).eq('id', existingAlert.id);

      // Clean up duplicates
      if (otherAlertIds.length > 0) {
        await supabase.from('alerts').update({ is_read: true }).in('id', otherAlertIds);
      }
    } else {
      // If no new alert level and not cleared by rules above, resolve everything for this item
      await resolveAlerts();
    }
  } else if (calculatedLevel) {

    // No existing alert, but new problem detected
    const variation = getRandomItem(ALERT_VARIATIONS[calculatedLevel]);
    await supabase.from('alerts').insert({
      owner_id: ownerId,
      item_id: itemId,
      alert_level: calculatedLevel,
      alert_message: `${item.item_name}: ${variation.msg}`,
      days_missed: consecutiveMisses,
      suggested_action: variation.action,
      is_read: false,
      triggered_at: new Date().toISOString()
    });
  }
}



export async function calculateBusinessHealthScore(ownerId: string, weekStartDateStr: string) {
  try {
    const { data: owner } = await supabase.from('owners').select('*').eq('id', ownerId).single();
    const workingDays = owner?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const weekStart = new Date(weekStartDateStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // 7 days interval

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6); // 7 days interval

    const { data: leaves } = await supabase
      .from('shop_leaves')
      .select('leave_date')
      .eq('owner_id', ownerId)
      .gte('leave_date', formatDate(weekStart))
      .lte('leave_date', formatDate(weekEnd));

    const leaveDates = leaves ? leaves.map(l => l.leave_date) : [];

    // 1. Fetch current week's sales with items join
    const { data: currentSales, error: salesError } = await supabase
      .from('daily_sales')
      .select('quantity_sold, total_revenue, total_profit, items!inner(min_daily_target, cost_price)')
      .eq('owner_id', ownerId)
      .gte('sale_date', formatDate(weekStart))
      .lte('sale_date', formatDate(weekEnd));

    if (salesError) throw salesError;



    // 2. Fetch previous week's sales (for revenue growth)
    const { data: prevSales } = await supabase
      .from('daily_sales')
      .select('total_revenue')
      .eq('owner_id', ownerId)
      .gte('sale_date', formatDate(prevWeekStart))
      .lte('sale_date', formatDate(prevWeekEnd));

    // 3. Fetch total number of items
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

    // --- Calculations ---

    // A. Target Achievement Rate
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

    // C. Profit Margin
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

    // Normalize Profit Score: 20% margin = 100 points
    const profit_score = Math.min(100, (profit_margin / 20) * 100);

    // D. Expense Control (Placeholder)
    const expense_control = 100;

    // Final Weighted Score
    const score = (revenue_growth * 0.30) + (profit_score * 0.30) + (target_achievement_rate * 0.20) + (expense_control * 0.20);
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    // Upsert the score
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
        created_at: new Date().toISOString() // Force update timestamp
      }, {
        onConflict: 'owner_id,week_start_date'
      });

    if (upsertError) {
      // If upsert fails due to missing constraint, fallback to manual update
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
  } catch (error) {
    console.error('Error calculating health score:', error);
  }
}


