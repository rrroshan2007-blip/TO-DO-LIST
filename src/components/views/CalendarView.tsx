import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task } from '../../types/models';
import {
  buildCalendarMonthGrid,
  parseDateKey,
} from '../../utils/taskLogic';

interface CalendarViewProps {
  todayKey: string;
  onCreateTaskForDate: (dateKey: string) => void;
  onEditTask: (task: Task) => void;
}

const WEEKDAYS_MONDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_SUNDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  todayKey,
  onCreateTaskForDate,
  onEditTask,
}: CalendarViewProps) {
  const { tasks, categories, preferences, toggleTaskCompletion } = useApp();

  const todayDate = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const weekStartsOn = preferences?.week_starts_on || 'monday';
  const weekdayLabels =
    weekStartsOn === 'monday' ? WEEKDAYS_MONDAY : WEEKDAYS_SUNDAY;

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const cells = useMemo(
    () => buildCalendarMonthGrid(viewYear, viewMonth, weekStartsOn),
    [viewYear, viewMonth, weekStartsOn],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) || [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks]);

  const monthTitle = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(viewYear, viewMonth, 1));
  }, [viewYear, viewMonth]);

  const selectedDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(parseDateKey(selectedDateKey));
  }, [selectedDateKey]);

  const selectedTasks = useMemo(() => {
    const list = tasksByDate.get(selectedDateKey) || [];
    return [...list].sort((a, b) => Number(a.is_completed) - Number(b.is_completed));
  }, [selectedDateKey, tasksByDate]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
    setSelectedDateKey(todayKey);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
      {/* Monthly Grid */}
      <section
        aria-label="Monthly calendar"
        className="xl:col-span-8 rounded-xl border border-[#E5E0D8] bg-white p-4 sm:p-6 dark:border-[#41464E] dark:bg-[#2A3038]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#E5E0D8] dark:border-[#41464E]">
          <h2 className="text-base sm:text-lg font-semibold text-[#343B46] dark:text-[#F4F0E9]">
            {monthTitle}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-3 py-1.5 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] transition-colors"
            >
              Today
            </button>
            <div className="inline-flex items-center rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] p-0.5 dark:border-[#41464E] dark:bg-[#20252C]">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#343B46] hover:bg-white dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#343B46] hover:bg-white dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {weekdayLabels.map((day) => (
            <div
              key={day}
              className="py-1.5 text-[11px] font-medium text-[#696E75] dark:text-[#A7A9AA]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 42 Day Cells */}
        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((cell) => {
            const dayTasks = tasksByDate.get(cell.dateKey) || [];
            const isSelected = cell.dateKey === selectedDateKey;
            const isToday = cell.dateKey === todayKey;
            const pendingCount = dayTasks.filter((t) => !t.is_completed).length;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                aria-label={`${cell.dateKey}, ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'}`}
                aria-pressed={isSelected}
                className={`flex h-[68px] sm:h-[94px] overflow-hidden flex-col justify-between rounded-lg border p-1.5 sm:p-2 text-left transition-colors ${
                  isSelected
                    ? 'border-[#C18C64] bg-[#F2EDE5]/90 dark:border-[#C69A76] dark:bg-[#343B46]'
                    : cell.inCurrentMonth
                      ? 'border-[#E5E0D8]/70 bg-[#FAF8F4]/40 hover:border-[#D6CEC2] hover:bg-[#FAF8F4] dark:border-[#41464E]/60 dark:bg-[#20252C]/40 dark:hover:border-[#525862]'
                      : 'border-transparent bg-transparent text-[#858A90]/60 hover:bg-[#FAF8F4]/40 dark:text-[#8E9399]/50 dark:hover:bg-[#20252C]/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs tabular-nums ${
                      isToday
                        ? 'bg-[#C18C64] font-semibold text-white dark:bg-[#C69A76] dark:text-[#20252C]'
                        : cell.inCurrentMonth
                          ? 'font-medium text-[#343B46] dark:text-[#F4F0E9]'
                          : 'text-[#858A90]/70 dark:text-[#8E9399]/60'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {pendingCount > 0 && (
                    <span className="font-mono text-[10px] tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                      {pendingCount}
                    </span>
                  )}
                </div>

                {/* Compact Task Indicators */}
                {dayTasks.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => {
                      const cat = task.category_id
                        ? categoryMap.get(task.category_id)
                        : undefined;
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-1 text-[10px] leading-tight"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: task.is_completed
                                ? '#648B72'
                                : cat?.color || '#C18C64',
                            }}
                          />
                          <span
                            className={`hidden sm:inline truncate ${
                              task.is_completed
                                ? 'text-[#858A90] line-through'
                                : 'text-[#343B46] dark:text-[#F4F0E9]'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <span className="hidden sm:block text-[10px] text-[#696E75] dark:text-[#A7A9AA] pl-2.5">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Day Agenda */}
      <aside
        aria-label="Selected date agenda"
        className="xl:col-span-4 rounded-xl border border-[#E5E0D8] bg-white p-5 dark:border-[#41464E] dark:bg-[#2A3038]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E5E0D8] pb-4 dark:border-[#41464E]">
          <div>
            <p className="font-mono text-[11px] text-[#C18C64] dark:text-[#C69A76]">
              {selectedDateKey === todayKey ? 'Today' : selectedDateKey}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
              {selectedDateLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onCreateTaskForDate(selectedDateKey)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#C18C64] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        </div>

        <div className="mt-4">
          {selectedTasks.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2EDE5] text-[#696E75] dark:bg-[#343B46] dark:text-[#A7A9AA]">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-medium text-[#343B46] dark:text-[#F4F0E9]">
                No tasks on this day
              </p>
              <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                Create a task directly for {selectedDateLabel}.
              </p>
              <button
                type="button"
                onClick={() => onCreateTaskForDate(selectedDateKey)}
                className="mt-4 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-3.5 py-2 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                New task for this date
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#E5E0D8]/80 dark:divide-[#41464E]/80">
              {selectedTasks.map((task) => {
                const cat = task.category_id
                  ? categoryMap.get(task.category_id)
                  : undefined;
                return (
                  <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => void toggleTaskCompletion(task.id)}
                      aria-label={
                        task.is_completed
                          ? `Reopen "${task.title}"`
                          : `Complete "${task.title}"`
                      }
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.is_completed
                          ? 'border-[#648B72] bg-[#648B72] text-white'
                          : 'border-[#C8C2B8] bg-white hover:border-[#C18C64] dark:border-[#5A606A] dark:bg-[#20252C]'
                      }`}
                    >
                      {task.is_completed && <Check className="h-3 w-3 stroke-[2.5]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="min-w-0 flex-1 text-left group"
                    >
                      <p
                        className={`text-sm font-medium leading-snug ${
                          task.is_completed
                            ? 'line-through text-[#858A90]'
                            : 'text-[#343B46] group-hover:text-[#C18C64] dark:text-[#F4F0E9] dark:group-hover:text-[#C69A76]'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                        <span
                          className={
                            task.priority === 'high'
                              ? 'font-medium text-[#C96F68] dark:text-[#D8827B]'
                              : task.priority === 'medium'
                                ? 'font-medium text-[#B4813E] dark:text-[#DFB06E]'
                                : ''
                          }
                        >
                          {task.priority === 'high'
                            ? 'High priority'
                            : task.priority === 'medium'
                              ? 'Medium priority'
                              : 'Low priority'}
                        </span>
                        {cat && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 rounded-[2px]"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </span>
                          </>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
