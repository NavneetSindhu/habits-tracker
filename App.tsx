import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Settings, Sun, Moon, Target, X as CloseIcon, Activity, LayoutGrid, PlusCircle, Save, FolderOpen, RefreshCw, CheckCircle2, Cloud, Database, Download, Upload, StickyNote, Edit2, AlertCircle, RotateCcw } from 'lucide-react';
import { Habit, ThemeConfig, AppData, SubTask } from './types';
import HabitGrid from './components/HabitGrid';
import ConsistencyGraph from './components/ConsistencyGraph';
import ConsistencyHeatmap from './components/ConsistencyHeatmap';

const DEFAULT_THEME: ThemeConfig = {
  primary: '#6366f1',
  success: '#10b981',
  failure: '#f43f5e',
  empty: '#e2e8f0',
};

const THEME_PRESETS: { name: string; theme: ThemeConfig }[] = [
  { name: 'Classic', theme: { primary: '#6366f1', success: '#10b981', failure: '#f43f5e', empty: '#e2e8f0' } },
  { name: 'Oceanic', theme: { primary: '#06b6d4', success: '#10b981', failure: '#f43f5e', empty: '#f1f5f9' } },
  { name: 'Twilight', theme: { primary: '#a855f7', success: '#2dd4bf', failure: '#fb7185', empty: '#1e293b' } },
  { name: 'Evergreen', theme: { primary: '#10b981', success: '#059669', failure: '#ef4444', empty: '#f0fdf4' } },
  { name: 'Solar', theme: { primary: '#f59e0b', success: '#10b981', failure: '#e11d48', empty: '#fffbeb' } },
  { name: 'Cyber', theme: { primary: '#d946ef', success: '#2dd4bf', failure: '#f43f5e', empty: '#fdf4ff' } },
  { name: 'Nordic', theme: { primary: '#475569', success: '#0d9488', failure: '#be123c', empty: '#f8fafc' } },
  { name: 'Crimson', theme: { primary: '#e11d48', success: '#10b981', failure: '#475569', empty: '#fff1f2' } },
  { name: 'Botanical', theme: { primary: '#84cc16', success: '#059669', failure: '#f97316', empty: '#f7fee7' } }
];

type MomentumView = 'line' | 'heatmap' | 'both';

const DB_NAME = 'ConsistencyTrackerDB';
const STORE_NAME = 'appState';

const App: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [darkMode, setDarkMode] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [momentumView, setMomentumView] = useState<MomentumView>('heatmap');
  const [tracesWidth, setTracesWidth] = useState(110); // Even smaller default for mobile clarity
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newSubTasks, setNewSubTasks] = useState<string[]>([]);
  const [dbReady, setDbReady] = useState(false);

  // Initialize Responsive Defaults
  useEffect(() => {
    if (window.innerWidth > 640) {
      setTracesWidth(160);
    }
  }, []);

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get('main_data');

      getRequest.onsuccess = () => {
        const savedData = getRequest.result as AppData;
        if (savedData) {
          if (savedData.habits) {
            const migrated = savedData.habits.map(h => ({
              ...h,
              notes: h.notes || {},
              subTasks: h.subTasks || [],
              subTaskData: h.subTaskData || {}
            }));
            setHabits(migrated);
          }
          if (savedData.theme) setTheme(savedData.theme);
          if (typeof savedData.darkMode === 'boolean') setDarkMode(savedData.darkMode);
          if (savedData.momentumView) setMomentumView(savedData.momentumView);
          if (savedData.tracesColumnWidth) setTracesWidth(savedData.tracesColumnWidth);
        } else {
          setHabits([
            { id: '1', name: 'Deep Work Session', data: {}, notes: {}, subTasks: [], subTaskData: {} },
            { id: '2', name: 'Physical Training', data: {}, notes: {}, subTasks: [], subTaskData: {} }
          ]);
        }
        setDbReady(true);
      };
    };
  }, []);

  // Save to IndexedDB whenever state changes
  useEffect(() => {
    if (!dbReady) return;

    const timeout = setTimeout(() => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const dataToSave: AppData = {
          habits,
          theme,
          darkMode,
          momentumView,
          tracesColumnWidth: tracesWidth
        };
        store.put(dataToSave, 'main_data');
      };
    }, 500);

    return () => clearTimeout(timeout);
  }, [habits, theme, darkMode, momentumView, tracesWidth, dbReady]);

  // Clean up effect: Mark unmarked tasks from past days as crossed
  useEffect(() => {
    if (!dbReady || habits.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setHabits(prev => {
      let changed = false;
      const nextHabits = prev.map(habit => {
        const nextData = { ...habit.data };
        let habitChanged = false;

        for (let i = 1; i <= 60; i++) {
          const pastDate = new Date();
          pastDate.setDate(today.getDate() - i);
          const dateKey = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
          
          if (nextData[dateKey] === undefined || nextData[dateKey] === 0) {
            nextData[dateKey] = -1; // Auto-cross
            habitChanged = true;
          }
        }

        if (habitChanged) {
          changed = true;
          return { ...habit, data: nextData };
        }
        return habit;
      });

      return changed ? nextHabits : prev;
    });
  }, [dbReady, habits.length]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
  }, [theme.primary]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const exportData = () => {
    const data: AppData = { habits, theme, darkMode, momentumView, tracesColumnWidth: tracesWidth };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consistency-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: AppData = JSON.parse(e.target?.result as string);
        if (data.habits) setHabits(data.habits);
        if (data.theme) setTheme(data.theme);
        if (typeof data.darkMode === 'boolean') setDarkMode(data.darkMode);
        if (data.momentumView) setMomentumView(data.momentumView);
        if (data.tracesColumnWidth) setTracesWidth(data.tracesColumnWidth);
        setShowSettings(false);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const resetData = () => {
    if (window.confirm('WARNING: This will permanently erase all habits and trace data. Continue?')) {
      setHabits([
        { id: '1', name: 'Deep Work Session', data: {}, notes: {}, subTasks: [], subTaskData: {} },
        { id: '2', name: 'Physical Training', data: {}, notes: {}, subTasks: [], subTaskData: {} }
      ]);
      setTheme(DEFAULT_THEME);
      setMomentumView('heatmap');
      setTracesWidth(window.innerWidth > 640 ? 160 : 110);
      setShowSettings(false);
    }
  };

  const daysInMonth = useMemo(() => new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate(), [viewDate]);

  const stats = useMemo(() => {
    if (habits.length === 0) return { successRate: 0, totalChecks: 0, totalMissed: 0 };
    let totalChecks = 0;
    let totalMissed = 0;
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    
    habits.forEach(habit => {
      for (let d = 1; d <= daysInMonth; d++) {
        const val = habit.data[`${year}-${month}-${String(d).padStart(2, '0')}`];
        if (val === 1) totalChecks++;
        else if (val === -1) totalMissed++;
      }
    });
    const possible = habits.length * daysInMonth;
    return { 
      successRate: possible === 0 ? 0 : Math.round((totalChecks / possible) * 100), 
      totalChecks,
      totalMissed
    };
  }, [habits, viewDate, daysInMonth]);

  const toggleStatus = (habitId: string, day: number, type: 'check' | 'cross' | string) => {
    const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      
      const subTask = habit.subTasks.find(st => st.id === type);
      if (subTask) {
        const currentSubTaskData = { ...(habit.subTaskData[dateKey] || {}) };
        currentSubTaskData[subTask.id] = !currentSubTaskData[subTask.id];
        
        const nextSubTaskData = {
          ...habit.subTaskData,
          [dateKey]: currentSubTaskData
        };

        const allChecked = habit.subTasks.every(st => currentSubTaskData[st.id]);
        const nextMainData = { ...habit.data };
        if (allChecked) {
          nextMainData[dateKey] = 1;
        } else if (nextMainData[dateKey] === 1) {
          nextMainData[dateKey] = 0;
        }

        return {
          ...habit,
          data: nextMainData,
          subTaskData: nextSubTaskData
        };
      }

      const currentVal = habit.data[dateKey] || 0;
      let newVal = 0;
      if (type === 'check') newVal = currentVal === 1 ? 0 : 1;
      else if (type === 'cross') newVal = currentVal === -1 ? 0 : -1;
      
      return { ...habit, data: { ...habit.data, [dateKey]: newVal } };
    }));
  };

  const updateNote = (habitId: string, day: number, note: string) => {
    const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      return { ...habit, notes: { ...habit.notes, [dateKey]: note } };
    }));
  };

  const addHabit = useCallback(() => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      data: {},
      notes: {},
      subTasks: newSubTasks.filter(st => st.trim()).map((st, i) => ({ id: `${Date.now()}-${i}`, name: st })),
      subTaskData: {}
    };
    setHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    setNewSubTasks([]);
    setShowAddModal(false);
  }, [newHabitName, newSubTasks]);

  const updateHabit = (id: string, name: string, subTasks: SubTask[]) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, name, subTasks } : h));
    setShowEditModal(null);
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    setHabits(prev => {
      const oldIndex = prev.findIndex(h => h.id === draggedId);
      const newIndex = prev.findIndex(h => h.id === targetId);
      const newHabits = [...prev];
      const [removed] = newHabits.splice(oldIndex, 1);
      newHabits.splice(newIndex, 0, removed);
      return newHabits;
    });
  };

  const changeMonth = (offset: number) => setViewDate(prev => {
    const next = new Date(prev);
    next.setMonth(prev.getMonth() + offset);
    return next;
  });

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate);
  const editingHabit = useMemo(() => habits.find(h => h.id === showEditModal), [habits, showEditModal]);

  return (
    <div className="h-screen flex flex-col transition-colors duration-500 overflow-y-auto sm:overflow-hidden safe-top safe-bottom">
      <div className="flex-none sm:flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-12 pt-2 sm:pt-3 pb-4 sm:pb-6 flex flex-col sm:overflow-hidden relative">
        <header className="flex flex-row items-center justify-between mb-2 sm:mb-3 flex-shrink-0 px-1 sm:px-0 pt-2 sm:pt-0">
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-xl sm:text-2xl font-black dark:text-white text-slate-900 flex items-center gap-1.5 sm:gap-2 tracking-tighter">
              Tracing
              <div className="flex items-center gap-1 text-[7px] sm:text-[9px] font-black uppercase px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 shadow-sm transition-all duration-300">
                 <Database size={8} className="sm:w-[10px] sm:h-[10px]" /> Local
              </div>
            </h1>
            <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400">Consistency engine v2.2</p>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-95 group">
              {darkMode ? <Sun size={18} className="sm:w-5 sm:h-5 text-yellow-400 group-hover:rotate-45 transition-transform" /> : <Moon size={18} className="sm:w-5 sm:h-5 text-slate-500" />}
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-95">
              <Settings size={18} className="sm:w-5 sm:h-5 text-slate-500" />
            </button>
          </div>
        </header>

        <div className="flex-none sm:flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-6 items-stretch sm:overflow-hidden">
          <div className="xl:col-span-7 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between bg-white dark:bg-slate-850 p-1.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-2 sm:mb-4 flex-shrink-0">
              <button onClick={() => changeMonth(-1)} className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-300 transition-colors">
                <ChevronLeft size={16} strokeWidth={3} />
              </button>
              <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] sm:tracking-[0.3em] text-[9px] sm:text-[10px]">{monthName}</h2>
              <button onClick={() => changeMonth(1)} className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-300 transition-colors">
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="h-[480px] sm:flex-1 bg-white dark:bg-slate-850 rounded-[1.25rem] sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-1000 relative">
              <HabitGrid 
                habits={habits} 
                daysInMonth={daysInMonth} 
                viewDate={viewDate}
                onToggle={toggleStatus}
                onNoteUpdate={updateNote}
                onEditRequest={(id) => setShowEditModal(id)}
                onDelete={(id) => setHabits(prev => prev.filter(h => h.id !== id))}
                onReorder={handleReorder}
                theme={theme}
                columnWidth={tracesWidth}
                onResize={setTracesWidth}
              />
              <button 
                onClick={() => setShowAddModal(true)} 
                style={{ backgroundColor: theme.primary }} 
                className="fixed sm:absolute bottom-5 sm:bottom-6 right-5 sm:right-6 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full text-white font-black shadow-2xl hover:scale-105 active:scale-95 transition-all z-[100] border-[3px] sm:border-4 border-white dark:border-slate-900 group"
              >
                <Plus size={16} className="sm:w-5 sm:h-5" strokeWidth={4} />
                <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em]">Add Habit</span>
              </button>
            </div>
          </div>

          <div className="xl:col-span-5 flex flex-col gap-3 sm:gap-4 min-h-0 pb-16 sm:pb-0">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-shrink-0">
              <div className="bg-white dark:bg-slate-850 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-transform">
                <p className="text-[7px] sm:text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em] sm:tracking-[0.3em] mb-0.5 sm:mb-1">Consistency</p>
                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.successRate}<span className="text-[10px] sm:text-sm opacity-20 ml-0.5 sm:1">%</span></p>
              </div>
              <div className="bg-white dark:bg-slate-850 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-transform">
                <p className="text-[7px] sm:text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em] sm:tracking-[0.3em] mb-0.5 sm:mb-1">Checks</p>
                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalChecks}</p>
              </div>
              <div className="bg-white dark:bg-slate-850 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-transform col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[7px] sm:text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em] sm:tracking-[0.3em] mb-0.5 sm:mb-1">Missed</p>
                    <p className="text-base sm:text-xl font-black text-rose-500 dark:text-rose-400 tracking-tighter">{stats.totalMissed}</p>
                  </div>
                  <AlertCircle size={18} className="sm:w-5 sm:h-5 text-slate-100 dark:text-slate-800" strokeWidth={3} />
                </div>
              </div>
            </div>

            <div className="flex-none sm:flex-1 bg-white dark:bg-slate-850 rounded-[1rem] sm:rounded-[1.25rem] border border-slate-200 dark:border-slate-800 shadow-xl p-3 sm:p-5 flex flex-col overflow-hidden mb-6 sm:mb-0">
              <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
                <h3 className="font-black text-[8px] sm:text-[9px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-600 dark:text-slate-300">Analytics</h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setMomentumView('line')} className={`p-1 sm:p-1.5 rounded-lg transition-all ${momentumView === 'line' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <Activity size={10} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                  <button onClick={() => setMomentumView('heatmap')} className={`p-1 sm:p-1.5 rounded-lg transition-all ${momentumView === 'heatmap' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <LayoutGrid size={10} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                  <button onClick={() => setMomentumView('both')} className={`p-1 sm:p-1.5 rounded-lg transition-all ${momentumView === 'both' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    <PlusCircle size={10} className="sm:w-[14px] sm:h-[14px]" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 sm:overflow-y-auto hide-scrollbar space-y-6 sm:space-y-8">
                {(momentumView === 'line' || momentumView === 'both') && <ConsistencyGraph habits={habits} daysInMonth={daysInMonth} viewDate={viewDate} maxScore={Math.max(5, habits.length)} theme={theme} />}
                {(momentumView === 'heatmap' || momentumView === 'both') && <ConsistencyHeatmap habits={habits} daysInMonth={daysInMonth} viewDate={viewDate} theme={theme} />}
              </div>
            </div>
          </div>
        </div>

        {/* Modals with responsive sizing */}
        {showAddModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 animate-premium-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="bg-white dark:bg-slate-850 w-full max-w-md rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl animate-premium-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">New Habit</h3>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-600 dark:text-slate-300 mt-1">Daily goals engine</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"><CloseIcon size={18} /></button>
              </div>
              <div className="space-y-4 mb-8">
                <input 
                  autoFocus type="text" placeholder="Trace Name..." 
                  className="w-full px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-bold text-sm sm:text-base transition-all"
                  value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)}
                />
                <div className="space-y-2">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sub-Tasks (Optional)</p>
                  {newSubTasks.map((st, i) => (
                    <div key={i} className="flex gap-2">
                      <input 
                        type="text" placeholder={`Task ${i+1}`}
                        className="flex-1 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 outline-none text-[11px] sm:text-sm font-bold"
                        value={st} onChange={(e) => {
                          const updated = [...newSubTasks];
                          updated[i] = e.target.value;
                          setNewSubTasks(updated);
                        }}
                      />
                      <button onClick={() => setNewSubTasks(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><CloseIcon size={14}/></button>
                    </div>
                  ))}
                  <button onClick={() => setNewSubTasks(prev => [...prev, ''])} className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1 hover:underline">
                    <Plus size={10} /> Add Sub-Task
                  </button>
                </div>
              </div>
              <div className="flex gap-2.5 sm:gap-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 font-black text-slate-600 dark:text-slate-300 text-[8px] sm:text-[10px] uppercase tracking-widest transition-all">Cancel</button>
                <button onClick={addHabit} style={{ backgroundColor: theme.primary }} className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl text-white font-black text-[8px] sm:text-[10px] uppercase tracking-widest shadow-lg transition-all">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Habit Modal */}
        {showEditModal && editingHabit && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 animate-premium-backdrop" onClick={() => setShowEditModal(null)}>
            <div className="bg-white dark:bg-slate-850 w-full max-w-md rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl animate-premium-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">Edit Habit</h3>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-600 dark:text-slate-300 mt-1">Configuration</p>
                </div>
                <button onClick={() => setShowEditModal(null)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"><CloseIcon size={18} /></button>
              </div>
              <div className="space-y-4 mb-8">
                <input 
                  autoFocus type="text" placeholder="Trace Name..." 
                  className="w-full px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 dark:border-slate-800 dark:bg-slate-900 outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-bold text-sm sm:text-base transition-all"
                  value={editingHabit.name} onChange={(e) => setHabits(prev => prev.map(h => h.id === editingHabit.id ? {...h, name: e.target.value} : h))}
                />
                <div className="space-y-2">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sub-Tasks</p>
                  {editingHabit.subTasks.map((st, i) => (
                    <div key={st.id} className="flex gap-2">
                      <input 
                        type="text" placeholder={`Task ${i+1}`}
                        className="flex-1 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 outline-none text-[11px] sm:text-sm font-bold"
                        value={st.name} onChange={(e) => {
                          const updatedSubTasks = editingHabit.subTasks.map(s => s.id === st.id ? {...s, name: e.target.value} : s);
                          setHabits(prev => prev.map(h => h.id === editingHabit.id ? {...h, subTasks: updatedSubTasks} : h));
                        }}
                      />
                      <button onClick={() => {
                        const updatedSubTasks = editingHabit.subTasks.filter(s => s.id !== st.id);
                        setHabits(prev => prev.map(h => h.id === editingHabit.id ? {...h, subTasks: updatedSubTasks} : h));
                      }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><CloseIcon size={14}/></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newSt: SubTask = { id: `${Date.now()}-${editingHabit.subTasks.length}`, name: '' };
                    setHabits(prev => prev.map(h => h.id === editingHabit.id ? {...h, subTasks: [...h.subTasks, newSt]} : h));
                  }} className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1 hover:underline">
                    <Plus size={10} /> Add Sub-Task
                  </button>
                </div>
              </div>
              <div className="flex gap-2.5 sm:gap-4">
                <button onClick={() => setShowEditModal(null)} className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 font-black text-slate-600 dark:text-slate-300 text-[8px] sm:text-[10px] uppercase tracking-widest transition-all">Discard</button>
                <button onClick={() => setShowEditModal(null)} style={{ backgroundColor: theme.primary }} className="flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl text-white font-black text-[8px] sm:text-[10px] uppercase tracking-widest shadow-lg transition-all">Update</button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 animate-premium-backdrop" onClick={() => setShowSettings(false)}>
            <div className="bg-white dark:bg-slate-850 w-full max-w-4xl rounded-[1.5rem] sm:rounded-[3rem] p-5 sm:p-12 shadow-2xl animate-premium-in overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 sm:mb-10">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Preferences</h3>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-600 dark:text-slate-300 mt-1">Application Configuration</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"><CloseIcon size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
                <div className="space-y-6 sm:space-y-10">
                  <div>
                    <h4 className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 sm:mb-6">Data</h4>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <button onClick={exportData} className="flex flex-col items-center gap-1.5 sm:gap-3 p-3 sm:p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 transition-all group">
                        <Download size={18} className="sm:w-6 sm:h-6 text-slate-500 group-hover:text-indigo-500" />
                        <span className="text-[7px] sm:text-[9px] font-black uppercase">Export JSON</span>
                      </button>
                      <label className="flex flex-col items-center gap-1.5 sm:gap-3 p-3 sm:p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 transition-all group cursor-pointer">
                        <Upload size={18} className="sm:w-6 sm:h-6 text-slate-500 group-hover:text-indigo-500" />
                        <span className="text-[7px] sm:text-[9px] font-black uppercase">Import JSON</span>
                        <input type="file" accept=".json" onChange={importData} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 sm:mb-6">Theme Presets</h4>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {THEME_PRESETS.map(p => (
                        <button key={p.name} onClick={() => setTheme(p.theme)} className={`flex flex-col items-center gap-1 sm:gap-2 p-2 rounded-xl border-2 transition-all ${theme.primary === p.theme.primary ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-50 dark:border-slate-800'}`}>
                          <div className="w-3.5 h-3.5 sm:w-6 sm:h-6 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-850" style={{ backgroundColor: p.theme.primary }}></div>
                          <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-tighter text-slate-600 dark:text-slate-300">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6 sm:space-y-10">
                  <div>
                    <h4 className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 sm:mb-6">Palette Selection</h4>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {['primary', 'success', 'failure'].map(key => (
                        <div key={key} className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 ml-1">{key}</span>
                          <input type="color" value={(theme as any)[key]} onChange={e => setTheme({...theme, [key]: e.target.value})} className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg cursor-pointer bg-transparent" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[9px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 sm:mb-6">Maintenance</h4>
                    <button 
                      onClick={resetData}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all group"
                    >
                      <RotateCcw size={14} className="group-hover:-rotate-90 transition-transform duration-500" />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em]">Full Factory Reset</span>
                    </button>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                     <button onClick={() => setShowSettings(false)} style={{ backgroundColor: theme.primary }} className="w-full py-3.5 sm:py-5 rounded-xl sm:rounded-2xl text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] shadow-xl transition-all">Apply Changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;