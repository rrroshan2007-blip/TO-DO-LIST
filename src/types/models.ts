export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type ThemeMode = 'light' | 'dark' | 'system';

export type NavView =
  | 'overview'
  | 'tasks'
  | 'today'
  | 'upcoming'
  | 'calendar'
  | 'completed'
  | 'overdue'
  | 'categories'
  | 'settings';

export type SettingsTab =
  | 'profile'
  | 'security'
  | 'appearance'
  | 'notifications'
  | 'account';

export type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

/**
 * Matches Supabase `profiles` table
 */
export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Matches Supabase `categories` table
 */
export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

/**
 * Matches Supabase `subtasks` table
 */
export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

/**
 * Matches Supabase `tasks` table
 */
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  category_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
  recurrence: TaskRecurrence;
  created_at: string;
  updated_at: string;
}

/**
 * Matches Supabase `user_preferences` table
 */
export interface UserPreferences {
  id: string;
  user_id: string;
  theme: ThemeMode;
  notifications_enabled: boolean;
  due_date_reminders: boolean;
  daily_digest: boolean;
  week_starts_on: 'sunday' | 'monday';
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  user_id: string;
  email: string;
  signed_in_at: string;
  provider: 'local' | 'supabase';
}

export interface KnownAccountHint {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  last_signed_in_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string | null;
  priority: TaskPriority;
  category_id?: string | null;
  recurrence?: TaskRecurrence;
  subtasks?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: string | null;
  priority?: TaskPriority;
  category_id?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
  recurrence?: TaskRecurrence;
}

export interface TaskFilterOptions {
  search?: string;
  status?: 'all' | 'active' | 'completed';
  priority?: 'all' | TaskPriority;
  categoryId?: 'all' | 'uncategorized' | string;
  sortBy?: 'due_date' | 'priority' | 'created_at' | 'title';
  sortDir?: 'asc' | 'desc';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
