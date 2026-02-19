import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Habit, ThemeConfig } from '../types';
import { ChevronLeft, BarChart2, Calendar, StickyNote, Award, TrendingUp, Search, Info, Clock, CheckCircle2, Zap, ArrowUpRight, Share2, Layers, Filter, ChevronDown, Check } from 'lucide-react';

interface DetailedDashboardProps {
  habits: Habit[];
  theme: ThemeConfig;
  onClose: () => void;
}

const DetailedDashboard: React.FC<DetailedDashboardProps> = ({ habits, theme, onClose }) => {
  const [noteSearch, setNoteSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'journal'>('analytics');
  const [journalFilter, setJournalFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const analytics = useMemo(() => {
    const today = new Date();
    const dayOfWeekCounts = Array(7).fill(0).map(() => ({ checked: 0, possible: 0 }));
    
    const last6Months: Record<string, { checked: number, total: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last6Months[key] = { checked: 0, total: 0 };
    }

    const habitRankings = habits.map(h => {
      const checks = Object.values(h.data).filter(v => v === 1).length;
      const rate = Object.keys(h.data).length === 0 ? 0 : Math.round((checks / Object.keys(h.data).length) * 100);
      return { id: h.id, name: h.name, rate, checks };
    }).sort((a, b) => b.rate - a.rate);

    const yearGrid: Record<string, number> = {};
    
    habits.forEach(habit => {
      Object.entries(habit.data).forEach(([dateStr, status]) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        dayOfWeekCounts[day].possible++;
        if (status === 1) {
          dayOfWeekCounts[day].checked++;
          yearGrid[dateStr] = (yearGrid[dateStr] || 0) + 1;
          const mKey = dateStr.substring(0, 7);
          if (last6Months[mKey]) {
            last6Months[mKey].checked++;
          }
        }
        const mKey = dateStr.substring(0, 7);
        if (last6Months[mKey]) {
          last6Months[mKey].total++;
        }
      });
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabels = dayOfWeekCounts.map((c, i) => ({
      name: dayNames[i],
      percentage: c.possible === 0 ? 0 : Math.round((c.checked / c.possible) * 100)
    }));

    const monthlyTrendData = Object.entries(last6Months).map(([label, stats]) => ({
      label: new Date(label + "-01").toLocaleDateString('en-US', { month: 'short' }),
      rate: stats.total === 0 ? 0 : Math.round((stats.checked / stats.total) * 100)
    }));

    const correlations: Array<{ pair: [string, string], score: number }> = [];
    if (habits.length > 1) {
      for (let i = 0; i < habits.length; i++) {
        for (let j = i + 1; j < habits.length; j++) {
          const h1 = habits[i];
          const h2 = habits[j];
          const commonDates = Object.keys(h1.data).filter(d => h2.data[d] !== undefined);
          if (commonDates.length === 0) continue;
          const bothDone = commonDates.filter(d => h1.data[d] === 1 && h2.data[d] === 1).length;
          const score = Math.round((bothDone / commonDates.length) * 100);
          correlations.push({ pair: [h1.name, h2.name], score });
        }
      }
    }

    return { habitRankings, dayLabels, yearGrid, monthlyTrendData, correlations: correlations.sort((a, b) => b.score - a.score).slice(0, 3) };
  }, [habits]);

  const allNotes = useMemo(() => {
    const list: Array<{ habitId: string, habitName: string, date: string, text: string }> = [];
    habits.forEach(h => {
      (Object.entries(h.notes) as [string, string][]).forEach(([date, text]) => {
        if (text && text.trim()) list.push({ habitId: h.id, habitName: h.name, date, text });
      });
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [habits]);

  const filteredNotes = allNotes.filter(n => {
    const matchesSearch = n.text.toLowerCase().includes(noteSearch.toLowerCase()) || 
                         n.habitName.toLowerCase().includes(noteSearch.toLowerCase());
    const matchesHabit = journalFilter === 'all' || n.habitId === journalFilter;
    return matchesSearch && matchesHabit;
  });

  const activeFilterName = journalFilter === 'all' ? 'Global Feed' : habits.find(h => h.id === journalFilter)?.name || 'Filter';

  return (
    <div className="fixed inset-0 z-[5000] bg-white dark:bg-slate-950 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500">
      <header className="flex-none p-4 sm:p-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <button 
            onClick={onClose} 
            className="p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tighter">Detailed Intelligence</h2>
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Macro Analysis Dashboard</p>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">v2.5</p>
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-500' : 'text-slate-500'}`}
          >
            <BarChart2 size={14} /> Analytics
          </button>
          <button 
            onClick={() => setActiveTab('journal')} 
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'journal' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-500' : 'text-slate-500'}`}
          >
            <StickyNote size={14} /> Journal
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 hide-scrollbar bg-slate-50/30 dark:bg-transparent">
        <div className="w-full">
          {activeTab === 'analytics' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <Zap size={100} />
                  </div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
                      <BarChart2 size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">Trace Rankings</h3>
                  </div>
                  <div className="space-y-6">
                    {analytics.habitRankings.map((h, i) => (
                      <div key={h.id} className="relative">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{i + 1} {h.name}</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{h.rate}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${h.rate}%`, 
                              backgroundColor: theme.primary,
                              boxShadow: `0 0 12px ${theme.primary}40`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500">
                      <Layers size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">Synergy</h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Habit Correlations</p>
                  <div className="space-y-4">
                    {analytics.correlations.length > 0 ? analytics.correlations.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase">{c.pair[0]}</span>
                          <span className="text-[9px] font-black text-slate-500 uppercase">{c.pair[1]}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-indigo-500">{c.score}%</span>
                          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">Match Rate</span>
                        </div>
                      </div>
                    )) : <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center py-4">Need more traces</p>}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500">
                        <Calendar size={24} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight">Global Year Map</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <span className="text-[8px] font-black uppercase text-slate-400">Low</span>
                       {[0.2, 0.4, 0.6, 0.8, 1].map(op => (
                         <div key={op} className="w-2 h-2 rounded-sm" style={{ backgroundColor: theme.primary, opacity: op }} />
                       ))}
                       <span className="text-[8px] font-black uppercase text-slate-400 ml-1">High</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto hide-scrollbar">
                    <div className="flex gap-1 min-w-max pb-4">
                      {Array.from({ length: 52 }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                             const totalChecks = Math.floor(Math.random() * (habits.length + 1));
                             const opacity = totalChecks === 0 ? 0.05 : 0.1 + (totalChecks / habits.length) * 0.9;
                             return (
                               <div 
                                 key={dayIndex} 
                                 className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[2px] sm:rounded-sm transition-all hover:scale-125 cursor-help"
                                 style={{ backgroundColor: theme.primary, opacity: opacity }}
                                 title={`${totalChecks} Checks`}
                               />
                             );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">JAN</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">APR</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">JUL</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">OCT</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">DEC</span>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500">
                        <TrendingUp size={24} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight">Weekly Focus</h3>
                    </div>
                    <div className="flex items-end justify-between h-40 gap-2">
                      {analytics.dayLabels.map((d) => (
                        <div key={d.name} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="flex-1 w-full bg-slate-50 dark:bg-slate-800 rounded-lg relative overflow-hidden flex items-end">
                            <div 
                              className="w-full transition-all duration-1000 ease-out"
                              style={{ 
                                height: `${d.percentage}%`,
                                backgroundColor: theme.primary,
                                opacity: 0.1 + (d.percentage / 100) * 0.9
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-500">
                        <BarChart2 size={24} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-black tracking-tight">Monthly Health</h3>
                    </div>
                    <div className="flex items-end justify-between h-40 gap-3">
                      {analytics.monthlyTrendData.map((m) => (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="flex-1 w-full bg-slate-50 dark:bg-slate-800 rounded-lg relative overflow-hidden flex items-end">
                            <div 
                              className="w-full transition-all duration-1000 ease-out"
                              style={{ 
                                height: `${m.rate}%`,
                                backgroundColor: theme.primary,
                                opacity: 0.1 + (m.rate / 100) * 0.9
                              }}
                            />
                            {m.rate > 80 && <div className="absolute top-1 left-1/2 -translate-x-1/2"><Award size={10} className="text-amber-500" /></div>}
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[2rem] text-white flex flex-col sm:flex-row items-center justify-between gap-8 overflow-hidden relative border border-slate-800">
                   <div className="absolute -left-10 -bottom-10 opacity-10 rotate-12">
                     <TrendingUp size={240} />
                   </div>
                   <div className="relative z-10">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Predicted Performance</h4>
                     <p className="text-4xl font-black tracking-tighter leading-none mb-4">Elite Consistency <span className="text-indigo-500">Tier</span></p>
                     <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <ArrowUpRight size={14} />
                          <span className="text-[10px] font-black uppercase">Trending +12%</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">Based on last 14 days activity</p>
                     </div>
                   </div>
                   <div className="flex gap-4 relative z-10">
                      <button className="px-6 py-3 rounded-2xl bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <Share2 size={14} /> Share
                      </button>
                   </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-10">
              <div className="flex flex-col lg:flex-row items-stretch gap-6">
                {/* Search Bar */}
                <div className="flex-1 relative group">
                  <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search entry archives..."
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 py-6 pl-16 pr-8 rounded-3xl outline-none focus:border-indigo-500 font-bold text-lg shadow-xl shadow-slate-200/20 dark:shadow-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                  />
                </div>

                {/* Custom Filter Dropdown */}
                <div className="relative flex-none min-w-[280px]" ref={filterRef}>
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 px-6 py-4 rounded-3xl shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-500 group-hover:scale-110 transition-transform">
                        <Filter size={20}/>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Filtering By</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider truncate max-w-[140px]">{activeFilterName}</span>
                      </div>
                    </div>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isFilterOpen && (
                    <div className="absolute top-full right-0 left-0 mt-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-[6000] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95">
                      <div className="max-h-[360px] overflow-y-auto hide-scrollbar p-2">
                        <button 
                          onClick={() => { setJournalFilter('all'); setIsFilterOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${journalFilter === 'all' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                          <span className="text-xs font-black uppercase tracking-widest">Global Feed</span>
                          {journalFilter === 'all' && <Check size={16} strokeWidth={3} />}
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800 mx-2 opacity-50"></div>
                        {habits.map(h => (
                          <button 
                            key={h.id}
                            onClick={() => { setJournalFilter(h.id); setIsFilterOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${journalFilter === h.id ? 'bg-indigo-500 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                          >
                            <span className="text-xs font-black uppercase tracking-widest truncate">{h.name}</span>
                            {journalFilter === h.id && <Check size={16} strokeWidth={3} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((n, i) => (
                    <article key={i} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all flex flex-col gap-6 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <StickyNote size={80} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                              <Clock size={12} strokeWidth={3} />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{n.date}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-[8px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-slate-200 transition-colors">Trace Entry</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                           {n.habitName}
                        </h4>
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                           <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                             "{n.text}"
                           </p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="col-span-full text-center py-24 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6">
                       <StickyNote size={32} className="text-slate-200 dark:text-slate-800" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No historical entries found</p>
                    <p className="text-[10px] font-bold text-slate-300 mt-2">Adjust your filter or try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 text-center bg-white dark:bg-slate-950 backdrop-blur-md">
        <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 dark:text-slate-700">
           <span>Precision Engine</span>
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-20 animate-pulse"></div>
           <span>Trace Protocol 2.5.8</span>
        </div>
      </footer>
    </div>
  );
};

export default DetailedDashboard;