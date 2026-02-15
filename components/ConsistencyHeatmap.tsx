
import React, { useMemo, useState } from 'react';
import { Habit, ThemeConfig } from '../types';
import { X, CheckCircle2, Circle } from 'lucide-react';

interface ConsistencyHeatmapProps {
  habits: Habit[];
  daysInMonth: number;
  viewDate: Date;
  theme: ThemeConfig;
}

const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({ habits, daysInMonth, viewDate, theme }) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: number, count: number, x: number, y: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalHabits = habits.length;

  const dailyCounts = useMemo(() => {
    return days.map(day => {
      const month = String(viewDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${viewDate.getFullYear()}-${month}-${dayStr}`;
      const count = habits.filter(habit => habit.data[dateKey] === 1).length;
      return { day, count };
    });
  }, [habits, days, viewDate]);

  const selectedDayDetails = useMemo(() => {
    if (selectedDay === null) return null;
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(selectedDay).padStart(2, '0');
    const dateKey = `${viewDate.getFullYear()}-${month}-${dayStr}`;
    
    return {
      day: selectedDay,
      date: dateKey,
      habits: habits.map(h => ({
        id: h.id,
        name: h.name,
        completed: h.data[dateKey] === 1
      }))
    };
  }, [selectedDay, habits, viewDate]);

  const getDayStyle = (count: number) => {
    if (count === 0) return {};
    const minOpacity = 0.25;
    const opacity = minOpacity + (count / Math.max(1, totalHabits)) * (1 - minOpacity);
    return {
      backgroundColor: theme.primary,
      opacity: opacity,
      boxShadow: count > 0 ? `0 0 8px ${theme.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : 'none'
    };
  };

  const handleMouseEnter = (e: React.MouseEvent, day: number, count: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredDay({
      day,
      count,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="grid grid-cols-7 xs:grid-cols-7 sm:grid-cols-10 md:grid-cols-11 xl:grid-cols-11 gap-1.5 sm:gap-3">
          {dailyCounts.map(({ day, count }) => (
            <div 
              key={day}
              onMouseEnter={(e) => handleMouseEnter(e, day, count)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square w-full rounded-lg sm:rounded-xl transition-all duration-300 cursor-pointer relative group ${count === 0 ? 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800' : 'border border-transparent'} hover:scale-105 active:scale-95`}
              style={getDayStyle(count)}
            >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className={`text-[7px] sm:text-[8px] font-black ${count > (totalHabits / 2) ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{day}</span>
                </div>
            </div>
          ))}
        </div>

        {/* Fixed Position Tooltip to avoid Z-Index Issues */}
        {hoveredDay && !selectedDay && (
          <div 
            className="fixed z-[6000] pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95 ease-out shadow-2xl"
            style={{ 
              left: `${hoveredDay.x}px`,
              top: `${hoveredDay.y - 10}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl whitespace-nowrap flex flex-col items-center">
              <span className="opacity-60 uppercase tracking-widest text-[7px] sm:text-[8px] mb-0.5 sm:mb-1">Day {hoveredDay.day}</span>
              <span>{hoveredDay.count}/{totalHabits} Done</span>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-slate-900 dark:bg-white rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>
        )}

        {/* Selected Day Detailed View */}
        {selectedDayDetails && (
          <div 
            className="fixed inset-0 z-[7000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 animate-premium-backdrop"
            onClick={() => setSelectedDay(null)}
          >
            <div 
              className="bg-white dark:bg-slate-850 w-full max-w-sm rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-premium-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Day {selectedDayDetails.day} Details</h3>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">{new Date(selectedDayDetails.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  {/* Fix: replaced invalid sm:size with Tailwind classes */}
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="space-y-2 sm:space-y-3 max-h-[50vh] overflow-y-auto hide-scrollbar">
                {selectedDayDetails.habits.length > 0 ? (
                  selectedDayDetails.habits.map((h) => (
                    <div 
                      key={h.id}
                      className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-500/30"
                    >
                      <span className={`text-[11px] sm:text-xs font-bold ${h.completed ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                        {h.name}
                      </span>
                      {h.completed ? (
                        /* Fix: replaced invalid sm:size with Tailwind classes */
                        <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px] text-emerald-500" />
                      ) : (
                        /* Fix: replaced invalid sm:size with Tailwind classes */
                        <Circle size={16} className="sm:w-[18px] sm:h-[18px] text-slate-200 dark:text-slate-800" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">No habits</p>
                )}
              </div>

              <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Success</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {Math.round((selectedDayDetails.habits.filter(h => h.completed).length / Math.max(1, selectedDayDetails.habits.length)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-800 pt-4 sm:pt-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 mr-1 sm:2">Density</span>
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                {[0.4, 0.7, 1].map(op => (
                   <div key={op} className="w-3 h-3 sm:w-4 sm:h-4 rounded-md" style={{ backgroundColor: theme.primary, opacity: op }}></div>
                ))}
            </div>
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-300 dark:text-slate-600">
                Heatmap v2.1
            </p>
        </div>
      </div>
    </div>
  );
};

export default ConsistencyHeatmap;
