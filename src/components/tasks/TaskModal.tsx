import { useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORY_COLOR_SWATCHES } from '../../services/local/seedData';
import type {
  Subtask,
  Task,
  TaskPriority,
  TaskRecurrence,
} from '../../types/models';
import { addDaysToKey, getTodayKey } from '../../utils/taskLogic';
import { validateTaskTitle } from '../../utils/validation';

interface TaskModalProps {
  open: boolean;
  editingTask: Task | null;
  defaultDueDate?: string | null;
  defaultCategoryId?: string | null;
  onClose: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const RECURRENCES: { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function TaskModal({
  open,
  editingTask,
  defaultDueDate,
  defaultCategoryId,
  onClose,
}: TaskModalProps) {
  const {
    categories,
    subtasks,
    createTask,
    updateTask,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    createCategory,
    addToast,
  } = useApp();

  const todayKey = getTodayKey();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [categoryId, setCategoryId] = useState<string>('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    CATEGORY_COLOR_SWATCHES[0].hex,
  );

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const existingSubtasks: Subtask[] = editingTask
    ? subtasks.filter((s) => s.task_id === editingTask.id)
    : [];

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setDueDate(editingTask.due_date || '');
      setPriority(editingTask.priority);
      setCategoryId(editingTask.category_id || '');
      setRecurrence(editingTask.recurrence);
      setDraftSubtasks([]);
    } else {
      setTitle('');
      setDescription('');
      setDueDate(defaultDueDate !== undefined ? defaultDueDate || '' : todayKey);
      setPriority('medium');
      setCategoryId(defaultCategoryId || '');
      setRecurrence('none');
      setDraftSubtasks([]);
    }
    setSubtaskInput('');
    setShowNewCategory(false);
    setNewCategoryName('');
    setError(null);
  }, [open, editingTask, defaultDueDate, defaultCategoryId, todayKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isSaving, onClose]);

  if (!open) return null;

  const handleAddSubtask = async () => {
    const clean = subtaskInput.trim();
    if (!clean) return;
    if (editingTask) {
      await createSubtask(editingTask.id, clean);
      setSubtaskInput('');
    } else {
      setDraftSubtasks((prev) => [...prev, clean]);
      setSubtaskInput('');
    }
  };

  const handleCreateInlineCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await createCategory(newCategoryName.trim(), newCategoryColor);
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create category.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleErr = validateTaskTitle(title);
    if (titleErr) {
      setError(titleErr);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          priority,
          category_id: categoryId || null,
          recurrence,
        });
        addToast({ type: 'success', title: 'Task updated', description: title.trim() });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          priority,
          category_id: categoryId || null,
          recurrence,
          subtasks: draftSubtasks,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#20252C]/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-[#E5E0D8] bg-white dark:border-[#41464E] dark:bg-[#2A3038]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D8] px-6 py-4 dark:border-[#41464E]">
          <h2
            id="task-modal-title"
            className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]"
          >
            {editingTask ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task modal"
            className="rounded-lg p-1.5 text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
              >
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label
                htmlFor="task-title-input"
                className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
              >
                Task title
              </label>
              <input
                id="task-title-input"
                type="text"
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="What needs your attention?"
                className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm font-medium text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399] dark:focus:border-[#C69A76]"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="task-description-input"
                className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
              >
                Description
              </label>
              <textarea
                id="task-description-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context, links, or notes..."
                className="w-full resize-none rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399] dark:focus:border-[#C69A76]"
              />
            </div>

            {/* Due Date & Priority */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="task-due-date"
                  className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                >
                  Due date
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3 py-2 text-sm font-mono tabular-nums text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDueDate(todayKey)}
                    className="rounded-md bg-[#F2EDE5] px-2 py-1 text-[11px] font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:bg-[#343B46] dark:text-[#F4F0E9] dark:hover:bg-[#3E4754]"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(addDaysToKey(todayKey, 1))}
                    className="rounded-md bg-[#F2EDE5] px-2 py-1 text-[11px] font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:bg-[#343B46] dark:text-[#F4F0E9] dark:hover:bg-[#3E4754]"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(addDaysToKey(todayKey, 7))}
                    className="rounded-md bg-[#F2EDE5] px-2 py-1 text-[11px] font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:bg-[#343B46] dark:text-[#F4F0E9] dark:hover:bg-[#3E4754]"
                  >
                    +1 Week
                  </button>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="rounded-md px-2 py-1 text-[11px] text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5">
                  Priority
                </span>
                <div
                  role="radiogroup"
                  aria-label="Priority"
                  className="grid grid-cols-3 gap-1 rounded-lg bg-[#F2EDE5] p-1 dark:bg-[#20252C]"
                >
                  {PRIORITIES.map((opt) => {
                    const active = priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPriority(opt.value)}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-white text-[#343B46] shadow-xs dark:bg-[#343B46] dark:text-[#F4F0E9]'
                            : 'text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Category & Recurrence */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="task-category-select"
                    className="text-xs font-medium text-[#696E75] dark:text-[#A7A9AA]"
                  >
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory((prev) => !prev)}
                    className="text-[11px] font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                  >
                    {showNewCategory ? 'Cancel' : '+ New category'}
                  </button>
                </div>

                {showNewCategory ? (
                  <div className="space-y-2 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] p-2.5 dark:border-[#41464E] dark:bg-[#20252C]">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      aria-label="New category name"
                      className="w-full rounded-md border border-[#E5E0D8] bg-white px-2.5 py-1.5 text-xs text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => setNewCategoryColor(swatch.hex)}
                            aria-label={`Color ${swatch.name}`}
                            className={`h-5 w-5 rounded-full transition-transform ${
                              newCategoryColor === swatch.hex
                                ? 'ring-2 ring-[#343B46] ring-offset-1 dark:ring-[#F4F0E9] dark:ring-offset-[#20252C]'
                                : ''
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateInlineCategory}
                        className="rounded-md bg-[#343B46] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#252A33] dark:bg-[#C69A76] dark:text-[#20252C]"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    id="task-category-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3 py-2 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="task-recurrence-select"
                  className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                >
                  Repeat
                </label>
                <select
                  id="task-recurrence-select"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                  className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3 py-2 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                >
                  {RECURRENCES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <label
                htmlFor="modal-subtask-input"
                className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
              >
                Subtasks
              </label>

              {editingTask && existingSubtasks.length > 0 && (
                <ul className="mb-2.5 space-y-1.5">
                  {existingSubtasks.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/60 px-3 py-2 dark:border-[#41464E] dark:bg-[#20252C]/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSubtask(sub.id)}
                          aria-label={`Toggle subtask "${sub.title}"`}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            sub.is_completed
                              ? 'border-[#648B72] bg-[#648B72] text-white'
                              : 'border-[#C8C2B8] bg-white dark:border-[#5A606A] dark:bg-[#2A3038]'
                          }`}
                        >
                          {sub.is_completed && <Check className="h-3 w-3" />}
                        </button>
                        <span
                          className={`text-xs truncate ${
                            sub.is_completed
                              ? 'line-through text-[#858A90]'
                              : 'text-[#343B46] dark:text-[#F4F0E9]'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSubtask(sub.id)}
                        aria-label={`Remove subtask "${sub.title}"`}
                        className="text-[#858A90] hover:text-[#C96F68]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!editingTask && draftSubtasks.length > 0 && (
                <ul className="mb-2.5 space-y-1.5">
                  {draftSubtasks.map((subTitle, index) => (
                    <li
                      key={`${subTitle}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/60 px-3 py-2 text-xs text-[#343B46] dark:border-[#41464E] dark:bg-[#20252C]/50 dark:text-[#F4F0E9]"
                    >
                      <span className="truncate">{subTitle}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSubtasks((prev) => prev.filter((_, i) => i !== index))
                        }
                        aria-label={`Remove draft subtask "${subTitle}"`}
                        className="text-[#858A90] hover:text-[#C96F68]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="modal-subtask-input"
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddSubtask();
                    }
                  }}
                  placeholder="Add a step and press Enter..."
                  className="flex-1 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3 py-2 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399]"
                />
                <button
                  type="button"
                  onClick={() => void handleAddSubtask()}
                  disabled={!subtaskInput.trim()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E0D8] bg-[#F2EDE5] px-3 py-2 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] disabled:opacity-50 dark:border-[#41464E] dark:bg-[#343B46] dark:text-[#F4F0E9] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add step
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#E5E0D8] bg-[#FAF8F4]/60 px-6 py-4 dark:border-[#41464E] dark:bg-[#242A32] rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-[#E5E0D8] bg-white px-4 py-2 text-sm font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#C18C64] px-5 py-2 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {isSaving
                ? 'Saving...'
                : editingTask
                  ? 'Save changes'
                  : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
