import { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Sun,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavView, Task } from '../../types/models';
import {
  computeTaskMetrics,
  computeWeeklyCompletion,
  filterAndSortTasks,
  formatShortDueDate,
  isTaskUpcoming,
} from '../../utils/taskLogic';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { TaskRow } from '../tasks/TaskRow';
import { EmptyState } from '../ui/EmptyState';

interface OverviewViewProps {
  todayKey: string;
  onNavigate: (view: NavView) => void;
  onOpenNewTask: (defaultDueDate?: string | null) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function OverviewView({
  todayKey,
  onNavigate,
  onOpenNewTask,
  onEditTask,
  onDeleteTask,
}: OverviewViewProps) {
  const {
    tasks,
    categories,
    subtasks,
    toggleTaskCompletion,
    duplicateTask,
    updateTask,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    addToast,
  } = useApp();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const metrics = useMemo(
    () => computeTaskMetrics(tasks, todayKey),
    [tasks, todayKey],
  );

  const todayTasks = useMemo(() => {
    const dueToday = tasks.filter((t) => t.due_date === todayKey);
    const active = filterAndSortTasks(
      dueToday.filter((t) => !t.is_completed),
      { sortBy: 'priority', sortDir: 'desc' },
    );
    const done = dueToday.filter((t) => t.is_completed);
    return [...active, ...done];
  }, [tasks, todayKey]);

  const upcomingPreview = useMemo(() => {
    return filterAndSortTasks(
      tasks.filter((t) => isTaskUpcoming(t, todayKey)),
      { sortBy: 'due_date', sortDir: 'asc' },
    ).slice(0, 4);
  }, [tasks, todayKey]);

  const weeklyPoints = useMemo(
    () => computeWeeklyCompletion(tasks, todayKey),
    [tasks, todayKey],
  );

  const weeklyTotal = useMemo(
    () => weeklyPoints.reduce((acc, p) => acc + p.completedCount, 0),
    [weeklyPoints],
  );

  const maxWeeklyCount = useMemo(
    () => Math.max(3, ...weeklyPoints.map((p) => p.completedCount)),
    [weeklyPoints],
  );

  const handleRescheduleToday = async (taskId: string) => {
    await updateTask(taskId, { due_date: todayKey });
    addToast({ type: 'info', title: 'Moved to today' });
  };

  const statCards: {
    label: string;
    value: number;
    caption: string;
    targetView: NavView;
    icon: typeof Layers;
    accentClass: string;
  }[] = [
    {
      label: 'Total Tasks',
      value: metrics.total,
      caption: 'Across all categories',
      targetView: 'tasks',
      icon: Layers,
      accentClass: 'text-[#343B46] dark:text-[#F4F0E9]',
    },
    {
      label: 'Completed',
      value: metrics.completed,
      caption: `${weeklyTotal} finished this week`,
      targetView: 'completed',
      icon: CheckCircle2,
      accentClass: 'text-[#648B72] dark:text-[#79A488]',
    },
    {
      label: 'Pending',
      value: metrics.pending,
      caption: `${metrics.todayTotal - metrics.todayCompleted} due today`,
      targetView: 'tasks',
      icon: Clock,
      accentClass: 'text-[#C18C64] dark:text-[#C69A76]',
    },
    {
      label: 'Overdue',
      value: metrics.overdue,
      caption: metrics.overdue === 0 ? 'All on schedule' : 'Needs attention',
      targetView: 'overdue',
      icon: AlertCircle,
      accentClass:
        metrics.overdue > 0
          ? 'text-[#C96F68] dark:text-[#D8827B]'
          : 'text-[#648B72] dark:text-[#79A488]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 4 Overview Metric Cards */}
      <section aria-label="Workspace summary">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => onNavigate(card.targetView)}
                className="group flex flex-col justify-between rounded-xl border border-[#E5E0D8] bg-white p-4 sm:p-5 text-left transition-colors hover:border-[#C18C64]/60 dark:border-[#41464E] dark:bg-[#2A3038] dark:hover:border-[#C69A76]/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#696E75] dark:text-[#A7A9AA]">
                    {card.label}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F2EDE5] text-[#696E75] group-hover:bg-[#EDE5D9] dark:bg-[#343B46] dark:text-[#A7A9AA] transition-colors">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3.5 flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight ${card.accentClass}`}
                  >
                    {card.value}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-xs text-[#696E75] dark:text-[#A7A9AA]">
                  {card.caption}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left: Today's Tasks + Progress */}
        <section className="lg:col-span-8 space-y-4" aria-labelledby="today-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="today-heading"
                className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]"
              >
                Today’s focus
              </h2>
              <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                {metrics.todayTotal === 0
                  ? 'No tasks scheduled for today yet.'
                  : `${metrics.todayCompleted} of ${metrics.todayTotal} tasks completed today`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('today')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Subtle Daily Progress Bar */}
          <div className="rounded-xl border border-[#E5E0D8] bg-[#F2EDE5]/60 px-4 py-3 dark:border-[#41464E] dark:bg-[#2A3038]/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-[#343B46] dark:text-[#F4F0E9]">
                Daily progress
              </span>
              <span className="font-mono tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                {metrics.todayProgressPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={metrics.todayProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily task completion progress"
              className="h-2 w-full overflow-hidden rounded-full bg-[#E5E0D8] dark:bg-[#343B46]"
            >
              <div
                className="h-full rounded-full bg-[#C18C64] dark:bg-[#C69A76] transition-all duration-300"
                style={{ width: `${metrics.todayProgressPct}%` }}
              />
            </div>
          </div>

          {/* Inline Quick Add for Today */}
          <QuickAddTask
            defaultDueDate={todayKey}
            placeholder="Add a task for today and press Enter..."
          />

          {/* Today's Task Rows */}
          {todayTasks.length === 0 ? (
            <EmptyState
              icon={<Sun className="h-5 w-5" />}
              title="A clear slate for today"
              description="Schedule a task for today or pull in an upcoming priority to set your rhythm."
              actionLabel="Create a task"
              onAction={() => onOpenNewTask(todayKey)}
            />
          ) : (
            <div className="space-y-2.5">
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={
                    task.category_id
                      ? categoryMap.get(task.category_id)
                      : undefined
                  }
                  subtasks={subtasks.filter((s) => s.task_id === task.id)}
                  todayKey={todayKey}
                  onToggleComplete={(id) => void toggleTaskCompletion(id)}
                  onEdit={onEditTask}
                  onDuplicate={(id) => void duplicateTask(id)}
                  onDelete={onDeleteTask}
                  onRescheduleToday={(id) => void handleRescheduleToday(id)}
                  onToggleSubtask={(id) => void toggleSubtask(id)}
                  onAddSubtask={createSubtask}
                  onDeleteSubtask={(id) => void deleteSubtask(id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right: Weekly Productivity + Upcoming Preview */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Weekly Productivity Card */}
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-5 dark:border-[#41464E] dark:bg-[#2A3038]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                  Weekly rhythm
                </h2>
                <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                  Tasks completed over the last 7 days
                </p>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-[#343B46] dark:text-[#F4F0E9]">
                {weeklyTotal}
              </span>
            </div>

            <div
              className="mt-6 grid grid-cols-7 gap-2 items-end h-32"
              role="img"
              aria-label={`Weekly task completions totaling ${weeklyTotal} tasks`}
            >
              {weeklyPoints.map((pt) => {
                const heightPct =
                  pt.completedCount === 0
                    ? 8
                    : Math.max(
                        18,
                        Math.round((pt.completedCount / maxWeeklyCount) * 100),
                      );
                return (
                  <div
                    key={pt.dateKey}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                      {pt.completedCount}
                    </span>
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className={`w-full max-w-[26px] rounded-t-md transition-all duration-300 ${
                          pt.isToday
                            ? 'bg-[#C18C64] dark:bg-[#C69A76]'
                            : pt.completedCount > 0
                              ? 'bg-[#343B46]/80 dark:bg-[#F4F0E9]/70'
                              : 'bg-[#EDE5D9] dark:bg-[#343B46]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${
                        pt.isToday
                          ? 'font-semibold text-[#C18C64] dark:text-[#C69A76]'
                          : 'text-[#696E75] dark:text-[#A7A9AA]'
                      }`}
                    >
                      {pt.dayShort}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue Attention Callout (only if overdue > 0) */}
          {metrics.overdue > 0 && (
            <div className="rounded-xl border border-[#C96F68]/35 bg-[#C96F68]/[0.06] p-4 dark:border-[#D8827B]/35 dark:bg-[#C96F68]/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                    {metrics.overdue}{' '}
                    {metrics.overdue === 1 ? 'task is' : 'tasks are'} overdue
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                    Review past-due items to finish them or move them into today’s plan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('overdue')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B35852] hover:underline dark:text-[#E0928B]"
              >
                Review overdue tasks
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Upcoming Preview */}
          <div className="rounded-xl border border-[#E5E0D8] bg-white p-5 dark:border-[#41464E] dark:bg-[#2A3038]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                Up next
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('upcoming')}
                className="text-xs font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
              >
                See schedule
              </button>
            </div>

            {upcomingPreview.length === 0 ? (
              <div className="mt-4 py-4 text-center">
                <p className="text-xs text-[#696E75] dark:text-[#A7A9AA]">
                  No upcoming tasks scheduled yet.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenNewTask(null)}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Schedule ahead
                </button>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[#E5E0D8]/80 dark:divide-[#41464E]/80">
                {upcomingPreview.map((task) => {
                  const cat = task.category_id
                    ? categoryMap.get(task.category_id)
                    : undefined;
                  return (
                    <li key={task.id} className="py-2.5 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="group w-full text-left"
                      >
                        <p className="truncate text-sm font-medium text-[#343B46] group-hover:text-[#C18C64] dark:text-[#F4F0E9] dark:group-hover:text-[#C69A76] transition-colors">
                          {task.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                          <span className="font-mono tabular-nums">
                            {formatShortDueDate(task.due_date, todayKey)}
                          </span>
                          {cat && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{cat.name}</span>
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
    </div>
  );
}
