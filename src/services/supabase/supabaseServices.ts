import type {
  AuthSession,
  Category,
  CreateTaskInput,
  KnownAccountHint,
  Profile,
  Subtask,
  Task,
  UpdateTaskInput,
  UserPreferences,
} from '../../types/models';
import { getNextRecurringDueDate, getTodayKey } from '../../utils/taskLogic';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateTaskTitle,
} from '../../utils/validation';
import type {
  DayformServices,
  PasswordResetRequestResult,
  SignInInput,
  SignUpInput,
} from '../contracts';
import { getSupabaseClient } from './supabaseClient';

const KNOWN_ACCOUNTS_KEY = 'dayform_supabase_known_accounts_v1';

export class EmailConfirmationRequiredError extends Error {
  readonly email: string;
  constructor(email: string) {
    super(
      `Account created for ${email}. Please check your email inbox to confirm your address, then sign in.`,
    );
    this.name = 'EmailConfirmationRequiredError';
    this.email = email;
  }
}

function readKnownAccounts(): KnownAccountHint[] {
  try {
    const raw = localStorage.getItem(KNOWN_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownAccountHint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertKnownAccount(profile: Profile): void {
  try {
    const existing = readKnownAccounts().filter((a) => a.id !== profile.id);
    const updated: KnownAccountHint[] = [
      {
        id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        last_signed_in_at: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 6);
    localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function removeKnownAccount(userId: string): void {
  try {
    const next = readKnownAccounts().filter((a) => a.id !== userId);
    localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

async function ensureProfileRow(
  userId: string,
  fallbackEmail: string,
  fallbackDisplayName?: string,
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as Profile;
  }

  const displayName =
    fallbackDisplayName?.trim() ||
    fallbackEmail.split('@')[0] ||
    'User';

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName,
        email: fallbackEmail,
        avatar_url: null,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted as Profile;
}

export function createSupabaseServices(): DayformServices {
  return {
    mode: 'supabase',
    isCloudConfigured: true,

    auth: {
      async getSession(): Promise<AuthSession | null> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw new Error(error.message);
        const s = data.session;
        if (!s || !s.user) return null;

        return {
          access_token: s.access_token,
          user_id: s.user.id,
          email: s.user.email || '',
          signed_in_at: s.user.last_sign_in_at || new Date().toISOString(),
          provider: 'supabase',
        };
      },

      async getKnownAccounts(): Promise<KnownAccountHint[]> {
        return readKnownAccounts();
      },

      async signIn(
        input: SignInInput,
      ): Promise<{ session: AuthSession; profile: Profile }> {
        const emailErr = validateEmail(input.email);
        if (emailErr) throw new Error(emailErr);
        if (!input.password) throw new Error('Password is required.');

        const supabase = getSupabaseClient();
        const normalizedEmail = input.email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: input.password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.session || !data.user) {
          throw new Error('Sign in did not return an active session.');
        }

        const metaName =
          typeof data.user.user_metadata?.display_name === 'string'
            ? data.user.user_metadata.display_name
            : undefined;

        const profile = await ensureProfileRow(
          data.user.id,
          data.user.email || normalizedEmail,
          metaName,
        );
        upsertKnownAccount(profile);

        return {
          session: {
            access_token: data.session.access_token,
            user_id: data.user.id,
            email: data.user.email || normalizedEmail,
            signed_in_at: data.user.last_sign_in_at || new Date().toISOString(),
            provider: 'supabase',
          },
          profile,
        };
      },

      async signUp(
        input: SignUpInput,
      ): Promise<{ session: AuthSession; profile: Profile }> {
        const nameErr = validateDisplayName(input.display_name);
        if (nameErr) throw new Error(nameErr);
        const emailErr = validateEmail(input.email);
        if (emailErr) throw new Error(emailErr);
        const pwErr = validatePassword(input.password);
        if (pwErr) throw new Error(pwErr);

        const supabase = getSupabaseClient();
        const normalizedEmail = input.email.trim().toLowerCase();
        const cleanName = input.display_name.trim();

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: input.password,
          options: {
            data: {
              display_name: cleanName,
            },
            emailRedirectTo:
              typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('Could not create user account.');
        }

        // If Supabase email confirmation is enabled, session is null until verified.
        if (!data.session) {
          throw new EmailConfirmationRequiredError(normalizedEmail);
        }

        const profile = await ensureProfileRow(
          data.user.id,
          data.user.email || normalizedEmail,
          cleanName,
        );
        upsertKnownAccount(profile);

        return {
          session: {
            access_token: data.session.access_token,
            user_id: data.user.id,
            email: data.user.email || normalizedEmail,
            signed_in_at: new Date().toISOString(),
            provider: 'supabase',
          },
          profile,
        };
      },

      async signOut(): Promise<void> {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },

      async requestPasswordReset(
        email: string,
      ): Promise<PasswordResetRequestResult> {
        const emailErr = validateEmail(email);
        if (emailErr) throw new Error(emailErr);

        const supabase = getSupabaseClient();
        const normalizedEmail = email.trim().toLowerCase();

        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo:
              typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        return {
          email: normalizedEmail,
          message:
            'A password reset email has been sent. Open the link from your inbox or enter the 6-digit recovery code below.',
        };
      },

      async resetPassword(
        email: string,
        token: string,
        newPassword: string,
      ): Promise<void> {
        const pwErr = validatePassword(newPassword);
        if (pwErr) throw new Error(pwErr);

        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();

        // If not already in an active recovery session (via magic link), verify OTP code
        if (!sessionData.session) {
          const emailErr = validateEmail(email);
          if (emailErr) throw new Error(emailErr);
          if (!token.trim()) {
            throw new Error(
              'Enter the recovery code from your email, or click the reset link sent to your inbox.',
            );
          }

          const { error: verifyError } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: token.trim(),
            type: 'recovery',
          });
          if (verifyError) {
            throw new Error(verifyError.message);
          }
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          throw new Error(updateError.message);
        }

        await supabase.auth.signOut();
      },

      async changePassword(
        _userId: string,
        currentPassword: string,
        newPassword: string,
      ): Promise<void> {
        if (!currentPassword) throw new Error('Enter your current password.');
        const pwErr = validatePassword(newPassword);
        if (pwErr) throw new Error(pwErr);

        const supabase = getSupabaseClient();
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user?.email) {
          throw new Error('Could not verify your active account session.');
        }

        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: userData.user.email,
          password: currentPassword,
        });
        if (reauthErr) {
          throw new Error('Current password is incorrect.');
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateErr) {
          throw new Error(updateErr.message);
        }
      },

      async deleteAccount(userId: string, password: string): Promise<void> {
        if (!password) {
          throw new Error('Confirm your password to delete your account.');
        }

        const supabase = getSupabaseClient();
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user?.email) {
          throw new Error('Could not verify active session.');
        }

        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: userData.user.email,
          password,
        });
        if (reauthErr) {
          throw new Error('Password does not match. Account was not deleted.');
        }

        // Deletes profile and cascades to tasks, subtasks, categories, and preferences via FK + RLS.
        // Note: Permanently deleting the underlying auth.users record requires a server-side Edge Function.
        const { error: delErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        if (delErr) {
          throw new Error(delErr.message);
        }

        removeKnownAccount(userId);
        await supabase.auth.signOut();
      },
    },

    profiles: {
      async getProfile(userId: string): Promise<Profile | null> {
        const supabase = getSupabaseClient();
        const { data: userData } = await supabase.auth.getUser();
        const fallbackEmail = userData.user?.email || '';
        const metaName =
          typeof userData.user?.user_metadata?.display_name === 'string'
            ? userData.user.user_metadata.display_name
            : undefined;

        const profile = await ensureProfileRow(userId, fallbackEmail, metaName);
        upsertKnownAccount(profile);
        return profile;
      },

      async updateProfile(userId, updates): Promise<Profile> {
        const supabase = getSupabaseClient();
        const patch: Partial<Pick<Profile, 'display_name' | 'email' | 'avatar_url'>> =
          {};

        if (updates.display_name !== undefined) {
          const nameErr = validateDisplayName(updates.display_name);
          if (nameErr) throw new Error(nameErr);
          patch.display_name = updates.display_name.trim();
        }

        if (updates.email !== undefined) {
          const emailErr = validateEmail(updates.email);
          if (emailErr) throw new Error(emailErr);
          const normalized = updates.email.trim().toLowerCase();
          const { data: currentAuth } = await supabase.auth.getUser();
          if (
            currentAuth.user?.email &&
            currentAuth.user.email.toLowerCase() !== normalized
          ) {
            const { error: authEmailErr } = await supabase.auth.updateUser({
              email: normalized,
            });
            if (authEmailErr) throw new Error(authEmailErr.message);
          }
          patch.email = normalized;
        }

        if (updates.avatar_url !== undefined) {
          patch.avatar_url = updates.avatar_url;
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', userId)
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        const updated = data as Profile;
        upsertKnownAccount(updated);
        return updated;
      },

      async uploadAvatar(userId: string, file: File): Promise<string> {
        if (file.size > 2 * 1024 * 1024) {
          throw new Error('Profile image must be smaller than 2 MB.');
        }

        const supabase = getSupabaseClient();
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${userId}/avatar-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        const url = publicUrlData.publicUrl;
        await this.updateProfile(userId, { avatar_url: url });
        return url;
      },
    },

    tasks: {
      async listTasks(userId: string): Promise<Task[]> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []) as Task[];
      },

      async createTask(
        userId: string,
        input: CreateTaskInput,
      ): Promise<{ task: Task; subtasks: Subtask[] }> {
        const titleErr = validateTaskTitle(input.title);
        if (titleErr) throw new Error(titleErr);

        const supabase = getSupabaseClient();
        const { data: createdTask, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: input.title.trim(),
            description: (input.description || '').trim(),
            due_date: input.due_date || null,
            priority: input.priority || 'medium',
            category_id: input.category_id || null,
            is_completed: false,
            completed_at: null,
            recurrence: input.recurrence || 'none',
          })
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        const task = createdTask as Task;

        const cleanSubs = (input.subtasks || [])
          .map((s) => s.trim())
          .filter(Boolean);

        let createdSubtasks: Subtask[] = [];
        if (cleanSubs.length > 0) {
          const { data: subsData, error: subErr } = await supabase
            .from('subtasks')
            .insert(
              cleanSubs.map((title) => ({
                task_id: task.id,
                user_id: userId,
                title,
                is_completed: false,
              })),
            )
            .select('*');

          if (subErr) throw new Error(subErr.message);
          createdSubtasks = (subsData || []) as Subtask[];
        }

        return { task, subtasks: createdSubtasks };
      },

      async updateTask(
        userId: string,
        taskId: string,
        updates: UpdateTaskInput,
      ): Promise<Task> {
        if (updates.title !== undefined) {
          const titleErr = validateTaskTitle(updates.title);
          if (titleErr) throw new Error(titleErr);
        }

        const supabase = getSupabaseClient();
        const patch: Record<string, unknown> = {};
        if (updates.title !== undefined) patch.title = updates.title.trim();
        if (updates.description !== undefined)
          patch.description = updates.description.trim();
        if (updates.due_date !== undefined) patch.due_date = updates.due_date;
        if (updates.priority !== undefined) patch.priority = updates.priority;
        if (updates.category_id !== undefined)
          patch.category_id = updates.category_id;
        if (updates.recurrence !== undefined)
          patch.recurrence = updates.recurrence;
        if (updates.is_completed !== undefined) {
          patch.is_completed = updates.is_completed;
          patch.completed_at = updates.is_completed
            ? updates.completed_at || new Date().toISOString()
            : null;
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(patch)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as Task;
      },

      async toggleTaskCompletion(
        userId: string,
        taskId: string,
      ): Promise<{ updatedTask: Task; nextRecurringTask: Task | null }> {
        const supabase = getSupabaseClient();
        const { data: existing, error: fetchErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !existing) {
          throw new Error(fetchErr?.message || 'Task not found.');
        }

        const current = existing as Task;
        const nextCompleted = !current.is_completed;
        const now = new Date().toISOString();

        const { data: updatedRow, error: updErr } = await supabase
          .from('tasks')
          .update({
            is_completed: nextCompleted,
            completed_at: nextCompleted ? now : null,
          })
          .eq('id', taskId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (updErr) throw new Error(updErr.message);
        const updatedTask = updatedRow as Task;

        let nextRecurringTask: Task | null = null;
        if (nextCompleted && current.recurrence !== 'none') {
          const nextDue = getNextRecurringDueDate(
            current.due_date,
            current.recurrence,
            getTodayKey(),
          );
          if (nextDue) {
            const { data: nextRow, error: recErr } = await supabase
              .from('tasks')
              .insert({
                user_id: userId,
                title: current.title,
                description: current.description,
                due_date: nextDue,
                priority: current.priority,
                category_id: current.category_id,
                is_completed: false,
                completed_at: null,
                recurrence: current.recurrence,
              })
              .select('*')
              .single();

            if (!recErr && nextRow) {
              nextRecurringTask = nextRow as Task;
            }
          }
        }

        return { updatedTask, nextRecurringTask };
      },

      async deleteTask(userId: string, taskId: string): Promise<void> {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      },
    },

    categories: {
      async listCategories(userId: string): Promise<Category[]> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []) as Category[];
      },

      async createCategory(
        userId: string,
        name: string,
        color: string,
      ): Promise<Category> {
        const clean = name.trim();
        if (!clean) throw new Error('Category name is required.');
        if (clean.length > 36) {
          throw new Error('Category name must be under 36 characters.');
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: userId,
            name: clean,
            color: color || '#C18C64',
          })
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as Category;
      },

      async updateCategory(userId, categoryId, updates): Promise<Category> {
        const supabase = getSupabaseClient();
        const patch: Partial<Pick<Category, 'name' | 'color'>> = {};
        if (updates.name !== undefined) {
          const clean = updates.name.trim();
          if (!clean) throw new Error('Category name is required.');
          patch.name = clean;
        }
        if (updates.color !== undefined) {
          patch.color = updates.color;
        }

        const { data, error } = await supabase
          .from('categories')
          .update(patch)
          .eq('id', categoryId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as Category;
      },

      async deleteCategory(userId: string, categoryId: string): Promise<void> {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      },
    },

    subtasks: {
      async listSubtasks(userId: string): Promise<Subtask[]> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('subtasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []) as Subtask[];
      },

      async createSubtask(
        userId: string,
        taskId: string,
        title: string,
      ): Promise<Subtask> {
        const clean = title.trim();
        if (!clean) throw new Error('Subtask title cannot be empty.');

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('subtasks')
          .insert({
            task_id: taskId,
            user_id: userId,
            title: clean,
            is_completed: false,
          })
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as Subtask;
      },

      async toggleSubtask(userId: string, subtaskId: string): Promise<Subtask> {
        const supabase = getSupabaseClient();
        const { data: existing, error: fetchErr } = await supabase
          .from('subtasks')
          .select('*')
          .eq('id', subtaskId)
          .eq('user_id', userId)
          .single();

        if (fetchErr || !existing) {
          throw new Error(fetchErr?.message || 'Subtask not found.');
        }

        const { data, error } = await supabase
          .from('subtasks')
          .update({ is_completed: !(existing as Subtask).is_completed })
          .eq('id', subtaskId)
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as Subtask;
      },

      async deleteSubtask(userId: string, subtaskId: string): Promise<void> {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('subtasks')
          .delete()
          .eq('id', subtaskId)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      },
    },

    preferences: {
      async getPreferences(userId: string): Promise<UserPreferences> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (data) return data as UserPreferences;

        const { data: inserted, error: insErr } = await supabase
          .from('user_preferences')
          .upsert({ user_id: userId }, { onConflict: 'user_id' })
          .select('*')
          .single();

        if (insErr) throw new Error(insErr.message);
        return inserted as UserPreferences;
      },

      async updatePreferences(userId, updates): Promise<UserPreferences> {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: userId,
              ...updates,
            },
            { onConflict: 'user_id' },
          )
          .select('*')
          .single();

        if (error) throw new Error(error.message);
        return data as UserPreferences;
      },
    },
  };
}
