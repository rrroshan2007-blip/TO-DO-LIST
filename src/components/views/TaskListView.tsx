import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task, TaskPriority } from '../../types/models';
import {
  computeTaskMetrics,
  filterAndSortTasks,
  groupUpcomingTasks,
  isTaskOverdue,
} from '../../utils/taskLogic';
import { QuickAddTask } from '../tasks/QuickAddTask';
import { TaskRow } from '../tasks/TaskRow';
import { EmptyState } from '../ui/EmptyState';

type TaskListMode = 'tasks' | 'today' | 'upcoming' | 'completed' | 'overdue';

interface TaskListViewProps {
  mode: TaskListMode;
  todayKey: string;
  globalSearch: string;
  initialCategoryFilter?: string;
  onGlobalSearchChange: (q: string) => void;
  onClearCategoryFilter?: () => void;
  onOpenNewTask: (defaultDueDate?: string | null, defaultCategoryId?: string | null) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function TaskListView({
  mode,
  todayKey,
  globalSearch,
  initialCategoryFilter = 'all',
  onGlobalSearchChange,
  onClearCategoryFilter,
  onOpenNewTask,
  onEditTask,
  onDeleteTask,
}: TaskListViewProps) {
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at' | 'title'>(
    'due_date',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Sync external category filter if user clicked a category card
  const effectiveCategoryFilter =
    initialCategoryFilter !== 'all' ? initialCategoryFilter : categoryFilter;

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const metrics = useMemo(
    () => computeTaskMetrics(tasks, todayKey),
    [tasks, todayKey],
  );

  const filteredTasks = useMemo(() => {
    if (mode === 'today') {
      const dueToday = tasks.filter((t) => t.due_date === todayKey);
      const active = filterAndSortTasks(
        dueToday.filter((t) => !t.is_completed),
        { sortBy: 'priority', sortDir: 'desc' },
      );
      const done = dueToday.filter((t) => t.is_completed);
      return [...active, ...done];
    }

    if (mode === 'completed') {
      return [...tasks]
        .filter((t) => t.is_completed)
        .sort((a, b) =>
          (b.completed_at || b.updated_at).localeCompare(
            a.completed_at || a.updated_at,
          ),
        );
    }

    if (mode === 'overdue') {
      return filterAndSortTasks(
        tasks.filter((t) => isTaskOverdue(t, todayKey)),
        { sortBy: 'due_date', sortDir: 'asc' },
      );
    }

    // mode === 'tasks'
    return filterAndSortTasks(tasks, {
      search: globalSearch,
      status: statusFilter,
      priority: priorityFilter,
      categoryId: effectiveCategoryFilter,
      sortBy,
      sortDir,
    });
  }, [
    effectiveCategoryFilter,
    globalSearch,
    mode,
    priorityFilter,
    sortBy,
    sortDir,
    statusFilter,
    tasks,
    todayKey,
  ]);

  const upcomingGroups = useMemo(
    () => (mode === 'upcoming' ? groupUpcomingTasks(tasks, todayKey) : []),
    [mode, tasks, todayKey],
  );

  const handleRescheduleToday = async (taskId: string) => {
    await updateTask(taskId, { due_date: todayKey });
    addToast({ type: 'info', title: 'Rescheduled to today' });
  };

  const handleRescheduleAllOverdue = async () => {
    const overdueTasks = tasks.filter((t) => isTaskOverdue(t, todayKey));
    await Promise.all(
      overdueTasks.map((t) => updateTask(t.id, { due_date: todayKey })),
    );
    addToast({
      type: 'success',
      title: 'Overdue tasks rescheduled',
      description: `Moved ${overdueTasks.length} ${overdueTasks.length === 1 ? 'task' : 'tasks'} to today.`,
    });
  };

  const hasActiveFilters =
    Boolean(globalSearch.trim()) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    effectiveCategoryFilter !== 'all';

  const resetAllFilters = () => {
    onGlobalSearchChange('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    onClearCategoryFilter?.();
  };

  const renderTaskRow = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      category={task.category_id ? categoryMap.get(task.category_id) : undefined}
      subtasks={subtasks.filter((s) => s.task_id === task.id)}
      todayKey={todayKey}
      showCompletedTimestamp={mode === 'completed'}
      onToggleComplete={(id) => void toggleTaskCompletion(id)}
      onEdit={onEditTask}
      onDuplicate={(id) => void duplicateTask(id)}
      onDelete={onDeleteTask}
      onRescheduleToday={
        mode === 'overdue' || mode === 'tasks'
          ? (id) => void handleRescheduleToday(id)
          : undefined
      }
      onToggleSubtask={(id) => void toggleSubtask(id)}
      onAddSubtask={createSubtask}
      onDeleteSubtask={(id) => void deleteSubtask(id)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Mode-specific top controls */}
      {mode === 'today' && (
        <>
          <div className="rounded-xl border border-[#E5E0D8] bg-white px-5 py-4 dark:border-[#41464E] dark:bg-[#2A3038]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2.5">
              <span className="font-medium text-[#343B46] dark:text-[#F4F0E9]">
                Today’s progress · {metrics.todayCompleted} of {metrics.todayTotal} completed
              </span>
              <span className="font-mono tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                {metrics.todayProgressPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDE5D9] dark:bg-[#343B46]">
              <div
                className="h-full rounded-full bg-[#C18C64] dark:bg-[#C69A76] transition-all duration-300"
                style={{ width: `${metrics.todayProgressPct}%` }}
              />
            </div>
          </div>

          <QuickAddTask
            defaultDueDate={todayKey}
            placeholder="Add a task due today..."
          />
        </>
      )}

      {mode === 'tasks' && (
        <div className="space-y-4">
          <QuickAddTask
            defaultDueDate={todayKey}
            defaultCategoryId={
              effectiveCategoryFilter !== 'all' &&
              effectiveCategoryFilter !== 'uncategorized'
                ? effectiveCategoryFilter
                : null
            }
            placeholder="Capture a new task..."
          />

          {/* Filter & Sort Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#E5E0D8] bg-white p-3.5 dark:border-[#41464E] dark:bg-[#2A3038]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status Segmented Control */}
              <div
                role="group"
                aria-label="Filter by status"
                className="inline-flex items-center rounded-lg bg-[#F2EDE5] p-1 dark:bg-[#20252C]"
              >
                {(['all', 'active', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-white text-[#343B46] shadow-xs dark:bg-[#343B46] dark:text-[#F4F0E9]'
                        : 'text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Mobile Search Input */}
              <div className="relative flex-1 min-w-[180px] md:hidden">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#696E75]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => onGlobalSearchChange(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Filter tasks by keyword"
                  className="h-8 w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] pl-8 pr-3 text-xs text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(e.target.value as 'all' | TaskPriority)
                  }
                  aria-label="Filter by priority"
                  className="h-8 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-2.5 text-xs font-medium text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                >
                  <option value="all">All priorities</option>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>

                <select
                  value={effectiveCategoryFilter}
                  onChange={(e) => {
                    onClearCategoryFilter?.();
                    setCategoryFilter(e.target.value);
                  }}
                  aria-label="Filter by category"
                  className="h-8 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-2.5 text-xs font-medium text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                >
                  <option value="all">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="uncategorized">Uncategorized</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'due_date'
                        | 'priority'
                        | 'created_at'
                        | 'title',
                    )
                  }
                  aria-label="Sort tasks by"
                  className="h-8 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-2.5 text-xs font-medium text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                >
                  <option value="due_date">Sort: Due date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="created_at">Sort: Created</option>
                  <option value="title">Sort: Title</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  }
                  aria-label={`Sort direction: ${sortDir === 'asc' ? 'Ascending' : 'Descending'}`}
                  title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-2.5 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {sortDir === 'asc' ? 'Asc' : 'Desc'}
                  </span>
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between border-t border-[#E5E0D8]/70 pt-2.5 text-xs dark:border-[#41464E]/70">
                <span className="text-[#696E75] dark:text-[#A7A9AA] font-mono tabular-nums">
                  Showing {filteredTasks.length} matching{' '}
                  {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'overdue' && filteredTasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C96F68]/30 bg-[#C96F68]/[0.05] px-4 py-3 dark:border-[#D8827B]/30 dark:bg-[#C96F68]/10">
          <p className="text-xs text-[#343B46] dark:text-[#F4F0E9]">
            <span className="font-semibold font-mono tabular-nums">
              {filteredTasks.length}
            </span>{' '}
            {filteredTasks.length === 1 ? 'task is' : 'tasks are'} past due. You can reschedule all of them to today in one step.
          </p>
          <button
            type="button"
            onClick={() => void handleRescheduleAllOverdue()}
            className="rounded-lg bg-[#C18C64] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] whitespace-nowrap shrink-0"
          >
            Reschedule all to today
          </button>
        </div>
      )}

      {/* Content Area */}
      {mode === 'upcoming' ? (
        upcomingGroups.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="Nothing scheduled ahead"
            description="Plan future deadlines and milestones to keep your week predictable."
            actionLabel="Schedule a task"
            onAction={() => onOpenNewTask(null)}
          />
        ) : (
          <div className="space-y-7">
            {upcomingGroups.map((group) => (
              <section key={group.label} className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-2 dark:border-[#41464E]">
                  <h2 className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                    {group.label}
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                    {group.tasks.length}
                  </span>
                </div>
                <div className="space-y-2.5">{group.tasks.map(renderTaskRow)}</div>
              </section>
            ))}
          </div>
        )
      ) : filteredTasks.length === 0 ? (
        mode === 'today' ? (
          <EmptyState
            icon={<Sun className="h-5 w-5" />}
            title="No tasks scheduled for today"
            description="Add a priority above or create a detailed task with subtasks and categories."
            actionLabel="New task for today"
            onAction={() => onOpenNewTask(todayKey)}
          />
        ) : mode === 'completed' ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="No completed tasks yet"
            description="Tasks you finish will appear here with completion timestamps and can be reopened anytime."
          />
        ) : mode === 'overdue' ? (
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="No overdue tasks"
            description="Everything is up to date. Enjoy the breathing room."
          />
        ) : (
          <EmptyState
            icon={<ListTodo className="h-5 w-5" />}
            title={hasActiveFilters ? 'No tasks match your filters' : 'Your task list is empty'}
            description={
              hasActiveFilters
                ? 'Try clearing a filter or broadening your search phrase.'
                : 'Start by adding your first task to organize your day.'
            }
            actionLabel={hasActiveFilters ? 'Clear filters' : 'New task'}
            onAction={hasActiveFilters ? resetAllFilters : () => onOpenNewTask(todayKey)}
          />
        )
      ) : (
        <div className="space-y-2.5">
          {mode !== 'tasks' && mode !== 'today' && (
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-xs tabular-nums text-[#696E75] dark:text-[#A7A9AA]">
                {filteredTasks.length}{' '}
                {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </span>
              {mode === 'completed' && (
                <span className="text-xs text-[#696E75] dark:text-[#A7A9AA]">
                  Click a checkbox to reopen any task
                </span>
              )}
            </div>
          )}
          {filteredTasks.map(renderTaskRow)}
        </div>
      )}

      {/* Subtle footer action for Upcoming */}
      {mode === 'upcoming' && upcomingGroups.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onOpenNewTask(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-white px-4 py-2 text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[#C18C64] dark:text-[#C69A76]" />
            Schedule another task
          </button>
        </div>
      )}
    </div>
  );
}
