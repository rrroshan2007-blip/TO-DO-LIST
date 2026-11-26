import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Edit3,
  FolderKanban,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORY_COLOR_SWATCHES } from '../../services/local/seedData';
import type { Category } from '../../types/models';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';

interface CategoriesViewProps {
  onOpenCategoryTasks: (categoryId: string) => void;
  onCreateTaskInCategory: (categoryId: string) => void;
}

export function CategoriesView({
  onOpenCategoryTasks,
  onCreateTaskInCategory,
}: CategoriesViewProps) {
  const {
    categories,
    tasks,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useApp();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLOR_SWATCHES[0].hex);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(CATEGORY_COLOR_SWATCHES[0].hex);

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const statsByCategory = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const task of tasks) {
      if (!task.category_id) continue;
      const cur = map.get(task.category_id) || { total: 0, completed: 0 };
      cur.total += 1;
      if (task.is_completed) cur.completed += 1;
      map.set(task.category_id, cur);
    }
    return map;
  }, [tasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Enter a category name.');
      return;
    }
    setFormError(null);
    setIsCreating(true);
    try {
      await createCategory(name.trim(), color);
      setName('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = async (categoryId: string) => {
    if (!editName.trim()) return;
    await updateCategory(categoryId, {
      name: editName.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Create Custom Category Form */}
      <section
        aria-labelledby="new-category-heading"
        className="rounded-xl border border-[#E5E0D8] bg-white p-5 sm:p-6 dark:border-[#41464E] dark:bg-[#2A3038]"
      >
        <h2
          id="new-category-heading"
          className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]"
        >
          Create category
        </h2>
        <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
          Group related tasks under custom areas with subtle color coding.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="category-name-input"
              className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
            >
              Name
            </label>
            <input
              id="category-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="e.g., Client Projects, Reading, Wellness"
              className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/60 px-3.5 py-2 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9]"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-2">
              Tone
            </span>
            <div className="flex items-center gap-2 py-1">
              {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setColor(swatch.hex)}
                  aria-label={`Select ${swatch.name} color`}
                  aria-pressed={color === swatch.hex}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === swatch.hex
                      ? 'ring-2 ring-[#343B46] ring-offset-2 dark:ring-[#F4F0E9] dark:ring-offset-[#2A3038]'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#C18C64] px-4 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add category
          </button>
        </form>

        {formError && (
          <p role="alert" className="mt-2.5 text-xs font-medium text-[#C96F68] dark:text-[#D8827B]">
            {formError}
          </p>
        )}
      </section>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No categories yet"
          description="Create your first category above to organize tasks by project or life area."
        />
      ) : (
        <section aria-label="Your categories">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const stat = statsByCategory.get(cat.id) || { total: 0, completed: 0 };
              const pct =
                stat.total === 0
                  ? 0
                  : Math.round((stat.completed / stat.total) * 100);
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border border-[#E5E0D8] bg-white p-5 dark:border-[#41464E] dark:bg-[#2A3038]"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label="Edit category name"
                        className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-3 py-1.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                      />
                      <div className="flex items-center gap-1.5">
                        {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => setEditColor(swatch.hex)}
                            aria-label={`Color ${swatch.name}`}
                            className={`h-5 w-5 rounded-full ${
                              editColor === swatch.hex
                                ? 'ring-2 ring-[#343B46] ring-offset-1 dark:ring-[#F4F0E9]'
                                : ''
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-[#696E75] hover:bg-[#F2EDE5] dark:text-[#A7A9AA] dark:hover:bg-[#343B46]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(cat.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#343B46] px-2.5 py-1 text-xs font-medium text-white dark:bg-[#C69A76] dark:text-[#20252C]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0 rounded-[3px]"
                              style={{ backgroundColor: cat.color }}
                            />
                            <h3 className="truncate text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                              {cat.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(cat)}
                              aria-label={`Edit category ${cat.name}`}
                              className="rounded-md p-1.5 text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCategory(cat)}
                              aria-label={`Delete category ${cat.name}`}
                              className="rounded-md p-1.5 text-[#696E75] hover:bg-[#C96F68]/10 hover:text-[#C96F68] dark:text-[#A7A9AA] dark:hover:text-[#D8827B]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-[#696E75] dark:text-[#A7A9AA]">
                          <span className="font-mono tabular-nums">
                            {stat.completed} / {stat.total} completed
                          </span>
                          <span className="font-mono tabular-nums">{pct}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EDE5D9] dark:bg-[#343B46]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#E5E0D8]/80 pt-3.5 dark:border-[#41464E]/80">
                        <button
                          type="button"
                          onClick={() => onCreateTaskInCategory(cat.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New task
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenCategoryTasks(cat.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                        >
                          View tasks
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title={`Delete "${deletingCategory?.name}"?`}
        description="Tasks in this category will remain in your workspace as uncategorized items."
        confirmLabel="Delete category"
        tone="danger"
        onCancel={() => setDeletingCategory(null)}
        onConfirm={() => {
          if (deletingCategory) {
            void deleteCategory(deletingCategory.id);
          }
          setDeletingCategory(null);
        }}
      />
    </div>
  );
}
