import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { services } from '../services';
import { getSupabaseClient } from '../services/supabase/supabaseClient';
import type {
  PasswordResetRequestResult,
  SignInInput,
  SignUpInput,
} from '../services/contracts';
import type {
  AuthSession,
  Category,
  CreateTaskInput,
  KnownAccountHint,
  Profile,
  Subtask,
  Task,
  ThemeMode,
  ToastMessage,
  UpdateTaskInput,
  UserPreferences,
} from '../types/models';

const ACTIVE_THEME_STORAGE_KEY = 'dayform_active_theme';

interface AppContextValue {
  isLoading: boolean;
  isWorkspaceLoading: boolean;
  session: AuthSession | null;
  profile: Profile | null;
  knownAccounts: KnownAccountHint[];
  tasks: Task[];
  categories: Category[];
  subtasks: Subtask[];
  preferences: UserPreferences | null;
  effectiveTheme: 'light' | 'dark';
  toasts: ToastMessage[];
  dismissedNotificationIds: string[];
  serviceMode: 'local' | 'supabase';
  isCloudConfigured: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: (ids: string[]) => void;

  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;

  updateProfile: (
    updates: Partial<Pick<Profile, 'display_name' | 'email' | 'avatar_url'>>,
  ) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;

  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (taskId: string, updates: UpdateTaskInput) => Promise<Task>;
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<void>;

  createSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (subtaskId: string) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;

  createCategory: (name: string, color: string) => Promise<Category>;
  updateCategory: (
    categoryId: string,
    updates: Partial<Pick<Category, 'name' | 'color'>>,
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  updatePreferences: (
    updates: Partial<
      Pick<
        UserPreferences,
        'theme' | 'notifications_enabled' | 'due_date_reminders' | 'daily_digest' | 'week_starts_on'
      >
    >,
  ) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyThemeToDocument(mode: ThemeMode): 'light' | 'dark' {
  const effective = resolveEffectiveTheme(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }
  try {
    localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, mode);
  } catch {
    // ignore storage quota errors
  }
  return effective;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [knownAccounts, setKnownAccounts] = useState<KnownAccountHint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const saved =
      typeof localStorage !== 'undefined'
        ? (localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) as ThemeMode | null)
        : null;
    return resolveEffectiveTheme(saved || 'light');
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const loadWorkspaceData = useCallback(async (userId: string) => {
    setIsWorkspaceLoading(true);
    try {
      const [userProfile, userTasks, userCategories, userSubtasks, userPrefs, accounts] =
        await Promise.all([
          services.profiles.getProfile(userId),
          services.tasks.listTasks(userId),
          services.categories.listCategories(userId),
          services.subtasks.listSubtasks(userId),
          services.preferences.getPreferences(userId),
          services.auth.getKnownAccounts(),
        ]);

      setProfile(userProfile);
      setTasks(userTasks);
      setCategories(userCategories);
      setSubtasks(userSubtasks);
      setPreferences(userPrefs);
      setKnownAccounts(accounts);
      setDismissedNotificationIds([]);
      setEffectiveTheme(applyThemeToDocument(userPrefs.theme));
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [currentSession, accounts] = await Promise.all([
          services.auth.getSession(),
          services.auth.getKnownAccounts(),
        ]);
        if (!active) return;
        setKnownAccounts(accounts);
        setSession(currentSession);
        if (currentSession) {
          await loadWorkspaceData(currentSession.user_id);
        }
      } catch (err) {
        if (active) {
          addToast({
            type: 'error',
            title: 'Initialization error',
            description:
              err instanceof Error ? err.message : 'Unable to load local workspace.',
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [addToast, loadWorkspaceData]);

  // Listen to Supabase auth events (password recovery links, email verification, token refresh)
  useEffect(() => {
    if (services.mode !== 'supabase') return;
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setTasks([]);
        setCategories([]);
        setSubtasks([]);
        setPreferences(null);
        return;
      }
      if (event === 'SIGNED_IN' && nextSession?.user) {
        setSession((prev) => {
          if (prev?.user_id === nextSession.user.id) return prev;
          void loadWorkspaceData(nextSession.user.id);
          return {
            access_token: nextSession.access_token,
            user_id: nextSession.user.id,
            email: nextSession.user.email || '',
            signed_in_at:
              nextSession.user.last_sign_in_at || new Date().toISOString(),
            provider: 'supabase',
          };
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadWorkspaceData]);

  // Listen to OS theme preference changes when mode === 'system'
  useEffect(() => {
    const mode = preferences?.theme || 'light';
    setEffectiveTheme(applyThemeToDocument(mode));

    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setEffectiveTheme(applyThemeToDocument('system'));
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preferences?.theme]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const result = await services.auth.signIn(input);
      setSession(result.session);
      await loadWorkspaceData(result.session.user_id);
      addToast({
        type: 'success',
        title: `Welcome back, ${result.profile.display_name.split(' ')[0]}`,
      });
    },
    [addToast, loadWorkspaceData],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await services.auth.signUp(input);
      setSession(result.session);
      await loadWorkspaceData(result.session.user_id);
      addToast({
        type: 'success',
        title: 'Account created',
        description: `Your personal workspace is ready, ${result.profile.display_name.split(' ')[0]}.`,
      });
    },
    [addToast, loadWorkspaceData],
  );

  const signOut = useCallback(async () => {
    await services.auth.signOut();
    const accounts = await services.auth.getKnownAccounts();
    setKnownAccounts(accounts);
    setSession(null);
    setProfile(null);
    setTasks([]);
    setCategories([]);
    setSubtasks([]);
    setPreferences(null);
    addToast({
      type: 'info',
      title: 'Signed out',
      description: 'Sign in anytime to resume your workspace.',
    });
  }, [addToast]);

  const requestPasswordReset = useCallback(async (email: string) => {
    return services.auth.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(
    async (email: string, token: string, newPassword: string) => {
      await services.auth.resetPassword(email, token, newPassword);
      addToast({
        type: 'success',
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });
    },
    [addToast],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!session) throw new Error('Not signed in.');
      await services.auth.changePassword(session.user_id, currentPassword, newPassword);
      addToast({
        type: 'success',
        title: 'Password changed',
        description: 'Your account credentials have been updated.',
      });
    },
    [addToast, session],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      if (!session) throw new Error('Not signed in.');
      await services.auth.deleteAccount(session.user_id, password);
      const accounts = await services.auth.getKnownAccounts();
      setKnownAccounts(accounts);
      setSession(null);
      setProfile(null);
      setTasks([]);
      setCategories([]);
      setSubtasks([]);
      setPreferences(null);
      addToast({
        type: 'info',
        title: 'Account deleted',
        description: 'Your account and associated local tasks were removed.',
      });
    },
    [addToast, session],
  );

  const updateProfile = useCallback(
    async (
      updates: Partial<Pick<Profile, 'display_name' | 'email' | 'avatar_url'>>,
    ) => {
      if (!session) throw new Error('Not signed in.');
      const updated = await services.profiles.updateProfile(session.user_id, updates);
      setProfile(updated);
      if (updates.email) {
        setSession((prev) => (prev ? { ...prev, email: updated.email } : prev));
      }
      const accounts = await services.auth.getKnownAccounts();
      setKnownAccounts(accounts);
      addToast({
        type: 'success',
        title: 'Profile saved',
      });
    },
    [addToast, session],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!session) throw new Error('Not signed in.');
      const url = await services.profiles.uploadAvatar(session.user_id, file);
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: url, updated_at: new Date().toISOString() } : prev,
      );
      const accounts = await services.auth.getKnownAccounts();
      setKnownAccounts(accounts);
      addToast({
        type: 'success',
        title: 'Profile photo updated',
      });
    },
    [addToast, session],
  );

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!session) throw new Error('Not signed in.');
      const { task, subtasks: createdSubs } = await services.tasks.createTask(
        session.user_id,
        input,
      );
      setTasks((prev) => [task, ...prev]);
      if (createdSubs.length > 0) {
        setSubtasks((prev) => [...prev, ...createdSubs]);
      }
      addToast({
        type: 'success',
        title: 'Task created',
        description: task.title,
      });
      return task;
    },
    [addToast, session],
  );

  const updateTask = useCallback(
    async (taskId: string, updates: UpdateTaskInput) => {
      if (!session) throw new Error('Not signed in.');
      const updated = await services.tasks.updateTask(session.user_id, taskId, updates);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return updated;
    },
    [session],
  );

  const toggleTaskCompletion = useCallback(
    async (taskId: string) => {
      if (!session) throw new Error('Not signed in.');
      const { updatedTask, nextRecurringTask } =
        await services.tasks.toggleTaskCompletion(session.user_id, taskId);

      setTasks((prev) => {
        const mapped = prev.map((t) => (t.id === taskId ? updatedTask : t));
        return nextRecurringTask ? [nextRecurringTask, ...mapped] : mapped;
      });

      if (updatedTask.is_completed) {
        addToast({
          type: 'success',
          title: 'Task completed',
          description: nextRecurringTask
            ? `Next ${updatedTask.recurrence} occurrence scheduled for ${nextRecurringTask.due_date}.`
            : updatedTask.title,
          actionLabel: 'Undo',
          onAction: () => {
            void (async () => {
              const reverted = await services.tasks.updateTask(session.user_id, taskId, {
                is_completed: false,
                completed_at: null,
              });
              setTasks((prev) => prev.map((t) => (t.id === taskId ? reverted : t)));
            })();
          },
        });
      } else {
        addToast({
          type: 'info',
          title: 'Task reopened',
          description: updatedTask.title,
        });
      }
    },
    [addToast, session],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!session) throw new Error('Not signed in.');
      const target = tasks.find((t) => t.id === taskId);
      await services.tasks.deleteTask(session.user_id, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSubtasks((prev) => prev.filter((s) => s.task_id !== taskId));
      addToast({
        type: 'info',
        title: 'Task deleted',
        description: target?.title,
      });
    },
    [addToast, session, tasks],
  );

  const duplicateTask = useCallback(
    async (taskId: string) => {
      if (!session) throw new Error('Not signed in.');
      const source = tasks.find((t) => t.id === taskId);
      if (!source) return;
      const sourceSubs = subtasks
        .filter((s) => s.task_id === taskId)
        .map((s) => s.title);

      await createTask({
        title: `${source.title} (Copy)`,
        description: source.description,
        due_date: source.due_date,
        priority: source.priority,
        category_id: source.category_id,
        recurrence: source.recurrence,
        subtasks: sourceSubs,
      });
    },
    [createTask, session, subtasks, tasks],
  );

  const createSubtask = useCallback(
    async (taskId: string, title: string) => {
      if (!session) throw new Error('Not signed in.');
      const sub = await services.subtasks.createSubtask(session.user_id, taskId, title);
      setSubtasks((prev) => [...prev, sub]);
    },
    [session],
  );

  const toggleSubtask = useCallback(
    async (subtaskId: string) => {
      if (!session) throw new Error('Not signed in.');
      const updated = await services.subtasks.toggleSubtask(session.user_id, subtaskId);
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? updated : s)));
    },
    [session],
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      if (!session) throw new Error('Not signed in.');
      await services.subtasks.deleteSubtask(session.user_id, subtaskId);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    },
    [session],
  );

  const createCategory = useCallback(
    async (name: string, color: string) => {
      if (!session) throw new Error('Not signed in.');
      const created = await services.categories.createCategory(
        session.user_id,
        name,
        color,
      );
      setCategories((prev) => [...prev, created]);
      addToast({
        type: 'success',
        title: 'Category added',
        description: created.name,
      });
      return created;
    },
    [addToast, session],
  );

  const updateCategory = useCallback(
    async (
      categoryId: string,
      updates: Partial<Pick<Category, 'name' | 'color'>>,
    ) => {
      if (!session) throw new Error('Not signed in.');
      const updated = await services.categories.updateCategory(
        session.user_id,
        categoryId,
        updates,
      );
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
      addToast({ type: 'success', title: 'Category updated' });
    },
    [addToast, session],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!session) throw new Error('Not signed in.');
      await services.categories.deleteCategory(session.user_id, categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setTasks((prev) =>
        prev.map((t) =>
          t.category_id === categoryId ? { ...t, category_id: null } : t,
        ),
      );
      addToast({ type: 'info', title: 'Category deleted' });
    },
    [addToast, session],
  );

  const updatePreferences = useCallback(
    async (
      updates: Partial<
        Pick<
          UserPreferences,
          'theme' | 'notifications_enabled' | 'due_date_reminders' | 'daily_digest' | 'week_starts_on'
        >
      >,
    ) => {
      if (!session) throw new Error('Not signed in.');
      const updated = await services.preferences.updatePreferences(
        session.user_id,
        updates,
      );
      setPreferences(updated);
      if (updates.theme) {
        setEffectiveTheme(applyThemeToDocument(updates.theme));
      }
    },
    [session],
  );

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      setEffectiveTheme(applyThemeToDocument(theme));
      if (session) {
        const updated = await services.preferences.updatePreferences(session.user_id, {
          theme,
        });
        setPreferences(updated);
      }
    },
    [session],
  );

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const clearAllNotifications = useCallback((ids: string[]) => {
    setDismissedNotificationIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      isLoading,
      isWorkspaceLoading,
      session,
      profile,
      knownAccounts,
      tasks,
      categories,
      subtasks,
      preferences,
      effectiveTheme,
      toasts,
      dismissedNotificationIds,
      serviceMode: services.mode,
      isCloudConfigured: services.isCloudConfigured,
      isPasswordRecovery,
      clearPasswordRecovery,
      addToast,
      dismissToast,
      dismissNotification,
      clearAllNotifications,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      resetPassword,
      changePassword,
      deleteAccount,
      updateProfile,
      uploadAvatar,
      createTask,
      updateTask,
      toggleTaskCompletion,
      deleteTask,
      duplicateTask,
      createSubtask,
      toggleSubtask,
      deleteSubtask,
      createCategory,
      updateCategory,
      deleteCategory,
      updatePreferences,
      setTheme,
    }),
    [
      addToast,
      categories,
      changePassword,
      clearAllNotifications,
      createCategory,
      createSubtask,
      createTask,
      deleteAccount,
      deleteCategory,
      deleteSubtask,
      deleteTask,
      dismissNotification,
      dismissToast,
      dismissedNotificationIds,
      duplicateTask,
      effectiveTheme,
      isLoading,
      isPasswordRecovery,
      isWorkspaceLoading,
      knownAccounts,
      clearPasswordRecovery,
      preferences,
      profile,
      requestPasswordReset,
      resetPassword,
      session,
      setTheme,
      signIn,
      signOut,
      signUp,
      subtasks,
      tasks,
      toasts,
      toggleSubtask,
      toggleTaskCompletion,
      updateCategory,
      updatePreferences,
      updateProfile,
      updateTask,
      uploadAvatar,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
