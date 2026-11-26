import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TaskPriority } from '../../types/models';

interface QuickAddTaskProps {
  defaultDueDate: string | null;
  defaultCategoryId?: string | null;
  placeholder?: string;
}

export function QuickAddTask({
  defaultDueDate,
  defaultCategoryId = null,
  placeholder = 'Add a task quickly and press Enter...',
}: QuickAddTaskProps) {
  const { createTask } = useApp();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean || isAdding) return;
    setIsAdding(true);
    try {
      await createTask({
        title: clean,
        due_date: defaultDueDate,
        priority,
        category_id: defaultCategoryId,
      });
      setTitle('');
      setPriority('medium');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-[#E5E0D8] bg-white p-2 dark:border-[#41464E] dark:bg-[#2A3038]"
    >
      <div className="flex flex-1 items-center gap-2.5 px-2">
        <Plus className="h-4 w-4 shrink-0 text-[#C18C64] dark:text-[#C69A76]" aria-hidden="true" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          aria-label="Quick add task title"
          className="w-full bg-transparent py-1.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:outline-none dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399]"
        />
      </div>
      <div className="flex items-center justify-end gap-2 px-1 sm:px-0">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          aria-label="Quick task priority"
          className="rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-2.5 py-1.5 text-xs font-medium text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="submit"
          disabled={!title.trim() || isAdding}
          className="rounded-lg bg-[#343B46] px-3.5 py-1.5 text-xs font-medium text-[#FAF8F4] hover:bg-[#252A33] disabled:opacity-45 dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap shrink-0"
        >
          Add task
        </button>
      </div>
    </form>
  );
}
