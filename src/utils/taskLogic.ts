import type {
  Task,
  TaskFilterOptions,
  TaskPriority,
  TaskRecurrence,
} from '../types/models';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getTodayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function getTimeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatReadableDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDueDate(dateKey: string | null, todayKey: string): string {
  if (!dateKey) return 'No due date';
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDaysToKey(todayKey, -1)) return 'Yesterday';

  const date = parseDateKey(dateKey);
  const today = parseDateKey(todayKey);
  const sameYear = date.getFullYear() === today.getFullYear();

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

export function formatCompletedDate(isoString: string | null): string {
  if (!isoString) return 'Completed';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Completed';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function isTaskOverdue(task: Task, todayKey: string): boolean {
  if (task.is_completed || !task.due_date) return false;
  return task.due_date < todayKey;
}

export function isTaskDueToday(task: Task, todayKey: string): boolean {
  return task.due_date === todayKey;
}

export function isTaskUpcoming(task: Task, todayKey: string): boolean {
  if (task.is_completed || !task.due_date) return false;
  return task.due_date > todayKey;
}

export interface TaskMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  todayTotal: number;
  todayCompleted: number;
  todayProgressPct: number;
}

export function computeTaskMetrics(tasks: Task[], todayKey: string): TaskMetrics {
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  let todayTotal = 0;
  let todayCompleted = 0;

  for (const task of tasks) {
    if (task.is_completed) {
      completed += 1;
    } else {
      pending += 1;
      if (isTaskOverdue(task, todayKey)) {
        overdue += 1;
      }
    }

    if (task.due_date === todayKey) {
      todayTotal += 1;
      if (task.is_completed) {
        todayCompleted += 1;
      }
    }
  }

  const todayProgressPct =
    todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100);

  return {
    total: tasks.length,
    completed,
    pending,
    overdue,
    todayTotal,
    todayCompleted,
    todayProgressPct,
  };
}

export interface WeeklyDayPoint {
  dateKey: string;
  dayShort: string;
  completedCount: number;
  isToday: boolean;
}

export function computeWeeklyCompletion(
  tasks: Task[],
  todayKey: string,
): WeeklyDayPoint[] {
  const days: WeeklyDayPoint[] = [];
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

  for (let offset = -6; offset <= 0; offset += 1) {
    const key = addDaysToKey(todayKey, offset);
    const date = parseDateKey(key);
    let count = 0;

    for (const task of tasks) {
      if (!task.is_completed) continue;
      const completedKey = task.completed_at
        ? toDateKey(new Date(task.completed_at))
        : task.due_date;
      if (completedKey === key) {
        count += 1;
      }
    }

    days.push({
      dateKey: key,
      dayShort: weekdayFmt.format(date),
      completedCount: count,
      isToday: offset === 0,
    });
  }

  return days;
}

export function filterAndSortTasks(
  tasks: Task[],
  options: TaskFilterOptions = {},
): Task[] {
  const {
    search = '',
    status = 'all',
    priority = 'all',
    categoryId = 'all',
    sortBy = 'due_date',
    sortDir = 'asc',
  } = options;

  const q = search.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    if (status === 'active' && task.is_completed) return false;
    if (status === 'completed' && !task.is_completed) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    if (categoryId === 'uncategorized' && task.category_id !== null) return false;
    if (
      categoryId !== 'all' &&
      categoryId !== 'uncategorized' &&
      task.category_id !== categoryId
    ) {
      return false;
    }

    if (q) {
      const hay = `${task.title} ${task.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  const dir = sortDir === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date && !b.due_date) {
        return a.created_at.localeCompare(b.created_at) * dir;
      }
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      const cmp = a.due_date.localeCompare(b.due_date);
      if (cmp !== 0) return cmp * dir;
      return (PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
    }

    if (sortBy === 'priority') {
      const cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (cmp !== 0) return cmp * dir;
      return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
    }

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title) * dir;
    }

    return a.created_at.localeCompare(b.created_at) * dir;
  });
}

export function getNextRecurringDueDate(
  currentDueDate: string | null,
  recurrence: TaskRecurrence,
  fallbackTodayKey: string,
): string | null {
  if (recurrence === 'none') return null;
  const baseKey = currentDueDate || fallbackTodayKey;
  const date = parseDateKey(baseKey);

  if (recurrence === 'daily') {
    date.setDate(date.getDate() + 1);
    return toDateKey(date);
  }

  if (recurrence === 'weekdays') {
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6);
    return toDateKey(date);
  }

  if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7);
    return toDateKey(date);
  }

  if (recurrence === 'monthly') {
    const targetDay = date.getDate();
    const nextMonth = date.getMonth() + 1;
    date.setDate(1);
    date.setMonth(nextMonth);
    const daysInNextMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    date.setDate(Math.min(targetDay, daysInNextMonth));
    return toDateKey(date);
  }

  return null;
}

export interface CalendarCell {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

export function buildCalendarMonthGrid(
  year: number,
  monthIndex: number,
  weekStartsOn: 'sunday' | 'monday' = 'monday',
): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1, 12, 0, 0);
  const firstWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const offset =
    weekStartsOn === 'monday'
      ? (firstWeekday + 6) % 7
      : firstWeekday;

  const startDate = new Date(year, monthIndex, 1 - offset, 12, 0, 0);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push({
      dateKey: toDateKey(d),
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === monthIndex,
    });
  }

  return cells;
}

export interface UpcomingGroup {
  label: string;
  tasks: Task[];
}

export function groupUpcomingTasks(
  tasks: Task[],
  todayKey: string,
): UpcomingGroup[] {
  const tomorrowKey = addDaysToKey(todayKey, 1);
  const weekEndKey = addDaysToKey(todayKey, 7);

  const upcoming = filterAndSortTasks(
    tasks.filter((t) => isTaskUpcoming(t, todayKey)),
    { sortBy: 'due_date', sortDir: 'asc' },
  );

  const tomorrow: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];

  for (const task of upcoming) {
    if (task.due_date === tomorrowKey) {
      tomorrow.push(task);
    } else if (task.due_date && task.due_date <= weekEndKey) {
      thisWeek.push(task);
    } else {
      later.push(task);
    }
  }

  const groups: UpcomingGroup[] = [];
  if (tomorrow.length > 0) groups.push({ label: 'Tomorrow', tasks: tomorrow });
  if (thisWeek.length > 0) groups.push({ label: 'Next 7 days', tasks: thisWeek });
  if (later.length > 0) groups.push({ label: 'Later', tasks: later });

  return groups;
}
