import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Habit, ThemeConfig } from '../types';

interface ConsistencyGraphProps {
  habits: Array<Habit>;
  daysInMonth: number;
  viewDate: Date;
  maxScore: number;
  theme: ThemeConfig;
}

const ConsistencyGraph: React.FC<ConsistencyGraphProps> = ({ habits, daysInMonth, viewDate, maxScore, theme }) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const scores = Array.from({ length: maxScore + 1 }, (_, i) => maxScore - i);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compact dimensions
  const baseCellWidth = 44;
  const baseCellHeight = 32;
  
  const cellWidth = baseCellWidth * scale;
  const cellHeight = baseCellHeight * scale;

  const dailyStats = useMemo(() => {
    return days.map(day => {
      const month = String(viewDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${viewDate.getFullYear()}-${month}-${dayStr}`;
      
      const completed: string[] = [];
      habits.forEach(habit => {
        if (habit.data[dateKey] === 1) completed.push(habit.name);
      });
      
      return { day, count: completed.length, completed };
    });
  }, [habits, days, viewDate]);

  const pathData = useMemo(() => {
    if (habits.length === 0) return "";
    return dailyStats.reduce((acc, stat, i) => {
      const x = (i * cellWidth) + (cellWidth / 2);
      const y = (maxScore - stat.count) * cellHeight + (cellHeight / 2);
      return acc === "" ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [dailyStats, maxScore, cellWidth, cellHeight, habits.length]);

  const areaData = useMemo(() => {
    if (habits.length === 0) return "";
    const firstX = cellWidth / 2;
    const lastX = ((dailyStats.length - 1) * cellWidth) + (cellWidth / 2);
    const bottomY = scores.length * cellHeight;
    
    return `${pathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathData, dailyStats, cellWidth, cellHeight, scores.length, habits.length]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const isCurrentMonth = today.getFullYear() === viewDate.getFullYear() && today.getMonth() === viewDate.getMonth();
      if (isCurrentMonth) {
        const currentDay = today.getDate();
        const scrollAmount = Math.max(0, (currentDay - 2) * cellWidth);
        scrollContainerRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }, [viewDate, scale]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / lastTouchDistance.current;
      setScale(prev => Math.min(2, Math.max(0.6, prev * delta)));
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
  };

  const onMouseEnter = (e: React.MouseEvent, day: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredDay(day);
  };

  const hoveredData = hoveredDay ? dailyStats[hoveredDay - 1] : null;

  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-x-auto hide-scrollbar select-none relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative min-w-max p-4 pb-8 pt-4 overflow-visible">
        {hoveredData && (
          <div 
            className="fixed z-[5000] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 shadow-2xl"
            style={{ 
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 10}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-xl min-w-[160px]">
              <div className="flex items-center justify-between mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Day {hoveredDay}</span>
                <span className="text-indigo-500 text-[9px] font-black uppercase">{hoveredData.count} Done</span>
              </div>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto hide-scrollbar">
                {hoveredData.completed.length > 0 ? (
                  hoveredData.completed.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }}></div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] text-slate-400 italic">No activity</p>
                )}
              </div>
              <div className="w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>
        )}

        <div className="flex">
          <div className="flex flex-col w-8 sticky left-0 z-40 bg-white dark:bg-slate-850 shadow-[2px_0_4px_rgba(0,0,0,0.02)] border-r border-slate-50 dark:border-slate-800">
            {scores.map(s => (
              <div key={s} style={{ height: `${cellHeight}px` }} className="flex items-center justify-end pr-2 text-[8px] font-black text-slate-300 dark:text-slate-600">
                {s}
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            <div className="flex flex-col border-t border-slate-100 dark:border-slate-800" style={{ width: daysInMonth * cellWidth }}>
              {scores.map(s => (
                <div key={s} style={{ height: `${cellHeight}px` }} className="flex">
                  {days.map(d => (
                    <div 
                      key={d} 
                      className="flex-1 border-b border-slate-50 dark:border-slate-800/30 relative"
                      onMouseEnter={(e) => onMouseEnter(e, d)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <svg 
              className="absolute inset-0 pointer-events-none z-10 overflow-visible"
              width={daysInMonth * cellWidth}
              height={scores.length * cellHeight}
              viewBox={`0 0 ${daysInMonth * cellWidth} ${scores.length * cellHeight}`}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.primary} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
                </linearGradient>
              </defs>

              <path d={areaData} fill="url(#areaGradient)" className="transition-all duration-500" />
              <path d={pathData} fill="none" stroke={theme.primary} strokeWidth={3 * scale} strokeLinecap="round" strokeLinejoin="round" className="opacity-90 transition-all duration-500" />
              
              {dailyStats.map((stat, i) => (
                <g key={i}>
                  <circle 
                      cx={(i * cellWidth) + (cellWidth / 2)}
                      cy={(maxScore - stat.count) * cellHeight + (cellHeight / 2)}
                      r={hoveredDay === (i + 1) ? 6 * scale : 4 * scale}
                      fill={hoveredDay === (i + 1) ? theme.primary : "white"}
                      stroke={theme.primary}
                      strokeWidth={2 * scale}
                      className="transition-all duration-200"
                  />
                </g>
              ))}
            </svg>

            <div className="flex h-6 pt-2" style={{ width: daysInMonth * cellWidth }}>
              {days.map(d => (
                <div key={d} className={`flex-1 flex items-center justify-center text-[8px] font-black transition-colors ${hoveredDay === d ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-2 right-4 flex gap-2 opacity-40 hover:opacity-100 transition-opacity pointer-events-none sm:pointer-events-auto">
        <span className="text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Pinch to Zoom: {Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
};

export default ConsistencyGraph;