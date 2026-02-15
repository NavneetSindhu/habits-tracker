export interface SubTask {
  id: string;
  name: string;
}

export interface Habit {
  id: string;
  name: string;
  // Map of date string (YYYY-MM-DD) to status: 1 for checked, -1 for crossed, 0 for empty
  data: Record<string, number>;
  // Map of date string (YYYY-MM-DD) to personal notes
  notes: Record<string, string>;
  // List of sub-tasks for this habit
  subTasks: SubTask[];
  // Map of date string (YYYY-MM-DD) to sub-task completion state (subTaskId -> boolean)
  subTaskData: Record<string, Record<string, boolean>>;
}

export interface ThemeConfig {
  primary: string;
  success: string;
  failure: string;
  empty: string;
}

export interface AppData {
  habits: Habit[];
  theme: ThemeConfig;
  darkMode: boolean;
  momentumView: 'line' | 'heatmap' | 'both';
  tracesColumnWidth?: number;
}