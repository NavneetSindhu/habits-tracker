import React, { useMemo, useState } from 'react';
import { Habit } from '../types';
import { TrendingUp, Award, Zap, Calendar, ChevronRight } from 'lucide-react';

interface ProgressSummaryProps {
  habits: Habit[];
  theme: { primary: string };
}

type Period = 'weekly' | 'monthly' | 'yearly';

const ProgressSummary: React.FC<ProgressSummaryProps> = ({ habits, theme }) => {
  const [period, setPeriod] = useState<Period>('monthly');

  const stats = useMemo(() => {
    const now = new Date();
    const periods: Record<Period, number> = { weekly: 7, monthly: 30, yearly: 365 };
    const daysToLookBack = periods[period];
    
    let totalPossible = 0;
    let totalCompleted = 0;
    let longestStreak = 0;
    let currentStreak = 0;
    let activeDays = 0;

    const habitStreaks = habits.map(habit => {
      let maxHStreak = 0;
      let currHStreak = 0;
      const dateKeys = Object.keys(habit.data).sort().reverse();
      
      // Calculate current streak
      let foundToday = false;
      for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (habit.data[key] === 1) {
          currHStreak++;
        } else if (i > 0) { // Allow today to be incomplete without breaking streak
          break;
        }
      }

      // Calculate longest streak in history
      let tempStreak = 0;
      const sortedKeys = Object.keys(habit.data).sort();
      sortedKeys.forEach(key => {
        if (habit.data[key] === 1) {
          tempStreak++;
          maxHStreak = Math.max(maxHStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });

      return { maxHStreak, currHStreak };
    });

    longestStreak = Math.max(0, ...habitStreaks.map(h => h.maxHStreak));
    currentStreak = Math.max(0, ...habitStreaks.map(h => h.currHStreak));

    // Calculate completion for selected period
    for (let i = 0; i < daysToLookBack; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      
      let dayHasActivity = false;
      habits.forEach(habit => {
        totalPossible++;
        if (habit.data[key] === 1) {
          totalCompleted++;
          dayHasActivity = true;
        }
      });
      if (dayHasActivity) activeDays++;
    }

    const completionRate = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);
    const consistencyScore = Math.round((activeDays / daysToLookBack) * 100);

    return { completionRate, longestStreak, currentStreak, consistencyScore };
  }, [habits, period]);

  const MetricCard = ({ icon: Icon, label, value, subValue, color }: any) => (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-500/20 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</span>
        {subValue && <span className="text-[10px] font-bold text-slate-400">{subValue}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p 
                  ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-300 scale-105' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard 
          icon={TrendingUp} 
          label="Completion Rate" 
          value={`${stats.completionRate}%`} 
          subValue="of total goals"
        />
        <MetricCard 
          icon={Award} 
          label="Longest Streak" 
          value={stats.longestStreak} 
          subValue="days record"
        />
        <MetricCard 
          icon={Zap} 
          label="Consistency" 
          value={`${stats.consistencyScore}%`} 
          subValue="active days"
        />
        <MetricCard 
          icon={Calendar} 
          label="Current Momentum" 
          value={stats.currentStreak} 
          subValue="days running"
        />
      </div>

      <div className="mt-2 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Insights</span>
          <TrendingUp size={14} className="text-indigo-500" />
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
          {stats.completionRate > 70 
            ? "Your consistency is exceptional! You're performing in the top tier of goal-setters." 
            : stats.completionRate > 40 
              ? "Steady progress. Focus on closing the gap on your missed days to reach the next level." 
              : "Building habits takes time. Try focusing on just one core trace this week."}
        </p>
      </div>
    </div>
  );
};

export default ProgressSummary;