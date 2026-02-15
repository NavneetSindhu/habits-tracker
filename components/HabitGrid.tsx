
import React, { useEffect, useRef, useState } from 'react';
import { Habit, ThemeConfig } from '../types';
import { Check, X, Trash2, Target, GripVertical, Lock, ChevronDown, ChevronRight, StickyNote, Edit2 } from 'lucide-react';

interface HabitGridProps {
  habits: Habit[];
  daysInMonth: number;
  viewDate: Date;
  onToggle: (habitId: string, day: number, type: 'check' | 'cross' | string) => void;
  onNoteUpdate: (habitId: string, day: number, note: string) => void;
  onEditRequest: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  theme: ThemeConfig;
  columnWidth: number;
  onResize: (width: number) => void;
}

const HabitGrid: React.FC<HabitGridProps> = ({ 
  habits, daysInMonth, viewDate, onToggle, onNoteUpdate, onEditRequest, onDelete, onReorder, theme, columnWidth, onResize 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({});
  const [editingNote, setEditingNote] = useState<{ habitId: string, day: number, value: string } | null>(null);
  const [hoveredNote, setHoveredNote] = useState<{ habitName: string, date: string, content: string, x: number, y: number } | null>(null);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cellWidth = 52;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const isCurrentMonth = today.getFullYear() === viewDate.getFullYear() && today.getMonth() === viewDate.getMonth();
      if (isCurrentMonth) {
        const scrollAmount = Math.max(0, (today.getDate() - 3) * cellWidth);
        scrollContainerRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }, [viewDate]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.pageX;
    const startWidth = columnWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(90, Math.min(400, startWidth + (moveEvent.pageX - startX)));
      onResize(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleExpand = (id: string) => {
    setExpandedHabits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoteSave = () => {
    if (editingNote) {
      onNoteUpdate(editingNote.habitId, editingNote.day, editingNote.value);
      setEditingNote(null);
    }
  };

  const handleNoteHover = (e: React.MouseEvent, habit: Habit, day: number, dateKey: string) => {
    const note = habit.notes[dateKey];
    if (note) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setHoveredNote({
        habitName: habit.name,
        date: dateKey,
        content: note,
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div 
        className="relative overflow-x-auto hide-scrollbar select-none h-full" 
        ref={scrollContainerRef}
      >
        <div className="min-w-max">
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-[100]">
            <div 
              style={{ width: columnWidth }} 
              className="sticky left-0 z-[110] p-3 sm:p-6 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.3em] text-slate-800 dark:text-indigo-300 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-[3px_0_10px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_10px_rgba(0,0,0,0.3)]"
            >
              Traces
              <div 
                onMouseDown={startResizing}
                className={`absolute top-0 right-0 bottom-0 resizer-handle ${isResizing ? 'active' : ''}`}
              />
            </div>
            {days.map(day => {
              const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const isToday = today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
              
              const timeDiff = today.getTime() - checkDate.getTime();
              const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
              const isInteractable = dayDiff === 0 || dayDiff === 1;
              const isLocked = !isInteractable;
              
              return (
                <div key={day} className={`w-[52px] h-[48px] sm:h-[64px] flex flex-col items-center justify-center text-[10px] sm:text-xs font-black border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${isToday ? 'text-indigo-500 bg-indigo-500/5' : isLocked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-white'}`}>
                  <span className="opacity-30 text-[7px] sm:text-[9px] mb-0.5">{isLocked ? <Lock size={7}/> : 'DAY'}</span>
                  {day}
                  {isToday && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-500 mt-1 shadow-[0_0_6px_rgba(99,102,241,0.5)]"></div>}
                </div>
              );
            })}
          </div>

          <div className="pb-32">
            {habits.map((habit) => (
              <React.Fragment key={habit.id}>
                <div 
                  draggable 
                  onDragStart={() => setDraggedHabitId(habit.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedHabitId && draggedHabitId !== habit.id) {
                      onReorder(draggedHabitId, habit.id);
                    }
                  }}
                  onDragEnd={() => setDraggedHabitId(null)}
                  className={`group border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${draggedHabitId === habit.id ? 'dragging-row' : ''}`}
                >
                  <div className="flex">
                    <div 
                      style={{ width: columnWidth }} 
                      className="sticky left-0 z-[90] p-2.5 sm:p-6 flex items-center justify-between gap-1.5 sm:gap-2 bg-white dark:bg-slate-850 border-r border-slate-100 dark:border-slate-800 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800 shadow-[3px_0_10px_rgba(0,0,0,0.06)] dark:shadow-[3px_0_10px_rgba(0,0,0,0.25)]"
                    >
                      <div className="flex items-center gap-1 sm:gap-2 overflow-hidden flex-1">
                        <GripVertical size={11} className="text-slate-500 dark:text-slate-400 cursor-grab active:cursor-grabbing opacity-40 xs:hidden group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <button onClick={() => toggleExpand(habit.id)} className={`text-slate-400 hover:text-indigo-500 ${habit.subTasks.length === 0 ? 'opacity-0 cursor-default' : ''}`}>
                          {expandedHabits[habit.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider truncate text-slate-900 dark:text-slate-50 leading-tight">{habit.name}</span>
                      </div>
                      <div className="flex gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => onEditRequest(habit.id)}
                          className="p-1 sm:p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-500 rounded-lg transition-all"
                        >
                          {/* Fix: replaced invalid sm:size with Tailwind classes */}
                          <Edit2 size={9} className="sm:w-3 sm:h-3" strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => onDelete(habit.id)} 
                          className="p-1 sm:p-1.5 hover:bg-red-500 hover:text-white transition-all text-slate-400 rounded-lg"
                        >
                          {/* Fix: replaced invalid sm:size with Tailwind classes */}
                          <Trash2 size={9} className="sm:w-3 sm:h-3" strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col flex-1">
                      {[
                        { type: 'check' as const, icon: Check, color: theme.success },
                        { type: 'cross' as const, icon: X, color: theme.failure }
                      ].map(({ type, icon: Icon, color }) => (
                        <div key={type} className="flex border-b border-slate-50 dark:border-slate-800 last:border-b-0">
                          {days.map(day => {
                            const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                            const statusValue = type === 'check' ? 1 : -1;
                            const isActive = habit.data[dateKey] === statusValue;
                            const hasNote = habit.notes[dateKey];
                            
                            const timeDiff = today.getTime() - checkDate.getTime();
                            const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
                            const isInteractable = dayDiff === 0 || dayDiff === 1;

                            return (
                              <div 
                                key={day} 
                                onClick={() => isInteractable && onToggle(habit.id, day, type)}
                                onMouseEnter={(e) => hasNote && handleNoteHover(e, habit, day, dateKey)}
                                onMouseLeave={() => setHoveredNote(null)}
                                className={`w-[52px] h-[34px] sm:h-[42px] flex items-center justify-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 transition-all relative ${!isInteractable ? 'cursor-not-allowed bg-slate-50/10 dark:bg-slate-900/10' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                              >
                                {isInteractable ? (
                                  <>
                                    <div 
                                      className={`w-4.5 h-4.5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'animate-pop' : 'scale-90 opacity-20'}`} 
                                      style={{ 
                                        backgroundColor: isActive ? color : 'transparent', 
                                        border: `1.5px sm:border-2 solid ${isActive ? color : theme.primary}`,
                                        boxShadow: isActive ? `0 4px 10px ${color}22` : 'none'
                                      }}
                                    >
                                      {isActive && <Icon size={11} className="sm:w-[14px] sm:h-[14px] text-white" strokeWidth={5} />}
                                    </div>
                                    {isActive && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingNote({ habitId: habit.id, day, value: habit.notes[dateKey] || '' });
                                        }}
                                        className={`absolute top-0.5 right-0.5 transition-opacity ${hasNote ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} hover:opacity-100`}
                                      >
                                        <StickyNote size={7} className={hasNote ? 'text-indigo-500' : 'text-slate-400'} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-slate-600 dark:bg-slate-400 opacity-80' : 'bg-slate-300 dark:bg-slate-700 opacity-20'}`}></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {expandedHabits[habit.id] && habit.subTasks.map(subTask => (
                  <div key={subTask.id} className="group flex bg-slate-50/20 dark:bg-slate-900/20 border-b border-slate-50 dark:border-slate-800">
                    <div 
                      style={{ width: columnWidth }} 
                      className="sticky left-0 z-[80] p-2.5 pl-7 sm:p-4 sm:pl-12 flex items-center bg-slate-50/40 dark:bg-slate-900/40 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_6px_rgba(0,0,0,0.02)]"
                    >
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 truncate leading-tight">{subTask.name}</span>
                    </div>
                    <div className="flex flex-1">
                      {days.map(day => {
                        const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSubChecked = habit.subTaskData[dateKey]?.[subTask.id];
                        const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                        const timeDiff = today.getTime() - checkDate.getTime();
                        const isInteractable = Math.round(timeDiff / (1000 * 3600 * 24)) <= 1;

                        return (
                          <div 
                            key={day} 
                            onClick={() => isInteractable && onToggle(habit.id, day, subTask.id)}
                            className="w-[52px] h-[30px] sm:h-[36px] flex items-center justify-center border-r border-slate-100 dark:border-slate-800 last:border-r-0"
                          >
                             <div 
                                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-md flex items-center justify-center transition-all ${isSubChecked ? 'bg-indigo-500 shadow-sm' : 'border border-slate-200 dark:border-slate-700'} ${!isInteractable ? 'opacity-30' : 'cursor-pointer'}`}
                             >
                               {/* Fix: replaced invalid sm:size with Tailwind classes */}
                               {isSubChecked && <Check size={7} className="sm:w-2.5 sm:h-2.5 text-white" strokeWidth={4} />}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {editingNote && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 animate-premium-backdrop">
          <div className="bg-white dark:bg-slate-850 w-full max-w-sm rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-premium-in">
            <h4 className="text-[11px] sm:text-sm font-black uppercase tracking-widest mb-4">Add Daily Note</h4>
            <textarea 
              autoFocus
              className="w-full h-24 sm:h-32 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 outline-none text-[11px] sm:text-sm font-bold transition-all"
              placeholder="What happened today?"
              value={editingNote.value}
              onChange={(e) => setEditingNote({...editingNote, value: e.target.value})}
            />
            <div className="flex gap-2 sm:gap-3 mt-6">
              <button onClick={() => setEditingNote(null)} className="flex-1 py-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Discard</button>
              <button onClick={handleNoteSave} style={{ backgroundColor: theme.primary }} className="flex-1 py-3 rounded-lg sm:rounded-xl text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Save Trace</button>
            </div>
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Target className="text-slate-300 dark:text-slate-800 mb-6 animate-pulse" size={40} />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 text-center leading-relaxed">Start your first trace engine</p>
        </div>
      )}
    </div>
  );
};

export default HabitGrid;
