import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  MoreHorizontal,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { Category, Subtask, Task } from '../../types/models';
import {
  formatCompletedDate,
  formatShortDueDate,
  isTaskOverdue,
} from '../../utils/taskLogic';

interface TaskRowProps {
  task: Task;
  category?: Category;
  subtasks: Subtask[];
  todayKey: string;
  showCompletedTimestamp?: boolean;
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (taskId: string) => void;
  onDelete: (task: Task) => void;
  onRescheduleToday?: (taskId: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => void;
}

const PRIORITY_META = {
  high: {
    label: 'High',
    textClass: 'text-[#C96F68] dark:text-[#D8827B]',
  },
  medium: {
    label: 'Medium',
    textClass: 'text-[#B4813E] dark:text-[#DFB06E]',
  },
  low: {
    label: 'Low',
    textClass: 'text-[#696E75] dark:text-[#A7A9AA]',
  },
} as const;

const RECURRENCE_LABEL = {
  none: '',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  monthly: 'Monthly',
} as const;

export function TaskRow({
  task,
  category,
  subtasks,
  todayKey,
  showCompletedTimestamp = false,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onRescheduleToday,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const overdue = isTaskOverdue(task, todayKey);
  const priorityInfo = PRIORITY_META[task.priority];
  const completedSubCount = subtasks.filter((s) => s.is_completed).length;
  const hasExpandableContent =
    Boolean(task.description) || subtasks.length > 0;

  const handleAddSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed || isAddingSubtask) return;
    setIsAddingSubtask(true);
    try {
      await onAddSubtask(task.id, trimmed);
      setNewSubtaskTitle('');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  return (
    <div
      className={`group rounded-xl border transition-colors ${
        task.is_completed
          ? 'border-[#E5E0D8]/75 bg-[#FAF8F4]/70 dark:border-[#41464E]/60 dark:bg-[#252B33]/60'
          : 'border-[#E5E0D8] bg-white hover:border-[#D6CEC2] dark:border-[#41464E] dark:bg-[#2A3038] dark:hover:border-[#525862]'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-label={
            task.is_completed
              ? `Reopen "${task.title}"`
              : `Mark "${task.title}" as completed`
          }
          aria-pressed={task.is_completed}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
            task.is_completed
              ? 'border-[#648B72] bg-[#648B72] text-white dark:border-[#79A488] dark:bg-[#79A488] dark:text-[#20252C]'
              : 'border-[#C8C2B8] bg-white hover:border-[#C18C64] dark:border-[#5A606A] dark:bg-[#20252C] dark:hover:border-[#C69A76]'
          }`}
        >
          {task.is_completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-left min-w-0 flex-1 group/title"
              aria-expanded={expanded}
            >
              <span
                className={`block text-[14.5px] font-medium leading-snug transition-colors ${
                  task.is_completed
                    ? 'text-[#858A90] line-through dark:text-[#8E9399]'
                    : 'text-[#343B46] group-hover/title:text-[#1F242B] dark:text-[#F4F0E9]'
                }`}
              >
                {task.title}
              </span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {overdue && onRescheduleToday && (
                <button
                  type="button"
                  onClick={() => onRescheduleToday(task.id)}
                  className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#C18C64] hover:bg-[#F2EDE5] dark:text-[#C69A76] dark:hover:bg-[#343B46] transition-colors whitespace-nowrap"
                >
                  Move to today
                </button>
              )}

              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={
                  expanded
                    ? `Collapse details for "${task.title}"`
                    : `Expand details for "${task.title}"`
                }
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label={`More options for "${task.title}"`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-8 z-30 w-44 rounded-lg border border-[#E5E0D8] bg-white py-1 shadow-md dark:border-[#41464E] dark:bg-[#2A3038]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(task);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                      Edit task
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleComplete(task.id);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                    >
                      {task.is_completed ? (
                        <RotateCcw className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-[#648B72] dark:text-[#79A488]" />
                      )}
                      {task.is_completed ? 'Reopen task' : 'Mark completed'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate(task.id);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                      Duplicate
                    </button>
                    <div className="my-1 border-t border-[#E5E0D8] dark:border-[#41464E]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(task);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-[#C96F68] hover:bg-[#C96F68]/10 dark:text-[#D8827B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean unboxed inline metadata line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
            <span
              className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                overdue
                  ? 'font-medium text-[#C96F68] dark:text-[#D8827B]'
                  : task.due_date === todayKey && !task.is_completed
                    ? 'font-medium text-[#C18C64] dark:text-[#C69A76]'
                    : ''
              }`}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              {overdue
                ? `Overdue · ${formatShortDueDate(task.due_date, todayKey)}`
                : formatShortDueDate(task.due_date, todayKey)}
            </span>

            <span aria-hidden="true" className="text-[#C8C2B8] dark:text-[#5A606A]">
              ·
            </span>

            <span className={`font-medium ${priorityInfo.textClass}`}>
              {priorityInfo.label} priority
            </span>

            {category && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B8] dark:text-[#5A606A]">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#343B46] dark:text-[#D9DFE2]">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </span>
              </>
            )}

            {subtasks.length > 0 && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B8] dark:text-[#5A606A]">
                  ·
                </span>
                <span className="font-mono tabular-nums">
                  {completedSubCount}/{subtasks.length} subtasks
                </span>
              </>
            )}

            {task.recurrence !== 'none' && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B8] dark:text-[#5A606A]">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Repeat className="h-3 w-3" aria-hidden="true" />
                  {RECURRENCE_LABEL[task.recurrence]}
                </span>
              </>
            )}

            {showCompletedTimestamp && task.completed_at && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B8] dark:text-[#5A606A]">
                  ·
                </span>
                <span className="font-mono tabular-nums text-[#648B72] dark:text-[#79A488]">
                  Done {formatCompletedDate(task.completed_at)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expandable description & subtasks area */}
      {expanded && (
        <div className="border-t border-[#E5E0D8]/80 bg-[#FAF8F4]/70 px-4 py-3.5 pl-12 dark:border-[#41464E]/80 dark:bg-[#232830]/70 rounded-b-xl">
          {task.description ? (
            <p className="text-sm leading-relaxed text-[#545B66] dark:text-[#C5C7C9]">
              {task.description}
            </p>
          ) : (
            !hasExpandableContent && (
              <p className="text-xs text-[#696E75] dark:text-[#A7A9AA]">
                No notes added yet. Click edit to add details, or break this task into subtasks below.
              </p>
            )
          )}

          {/* Subtasks list */}
          <div className={task.description ? 'mt-3.5' : 'mt-1'}>
            {subtasks.length > 0 && (
              <ul className="space-y-1.5 mb-2.5">
                {subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-2 rounded-md py-1 pr-1"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleSubtask(sub.id)}
                        aria-label={
                          sub.is_completed
                            ? `Mark subtask "${sub.title}" incomplete`
                            : `Complete subtask "${sub.title}"`
                        }
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          sub.is_completed
                            ? 'border-[#648B72] bg-[#648B72] text-white dark:border-[#79A488] dark:bg-[#79A488] dark:text-[#20252C]'
                            : 'border-[#C8C2B8] bg-white hover:border-[#C18C64] dark:border-[#5A606A] dark:bg-[#20252C]'
                        }`}
                      >
                        {sub.is_completed && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </button>
                      <span
                        className={`text-xs sm:text-sm truncate ${
                          sub.is_completed
                            ? 'text-[#858A90] line-through dark:text-[#8E9399]'
                            : 'text-[#343B46] dark:text-[#F4F0E9]'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(sub.id)}
                      aria-label={`Delete subtask "${sub.title}"`}
                      className="rounded p-1 text-[#858A90] hover:bg-[#EDE5D9] hover:text-[#C96F68] dark:hover:bg-[#343B46] dark:hover:text-[#D8827B] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                aria-label={`Add subtask to ${task.title}`}
                className="flex-1 rounded-lg border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399] dark:focus:border-[#C69A76]"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E0D8] bg-[#F2EDE5] px-2.5 py-1.5 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] disabled:opacity-50 dark:border-[#41464E] dark:bg-[#343B46] dark:text-[#F4F0E9] dark:hover:bg-[#3F4754] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
