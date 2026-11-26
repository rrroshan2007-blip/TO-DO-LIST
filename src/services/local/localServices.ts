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
import { generateId, generateResetToken, hashPassword } from './crypto';
import {
  createInitialLocalSeed,
  type LocalDatabaseState,
} from './seedData';

const DB_STORAGE_KEY = 'dayform_local_db_v1';
const SESSION_STORAGE_KEY = 'dayform_local_session_v1';
const INITIALIZED_FLAG_KEY = 'dayform_local_bootstrapped_v1';

async function loadDb(): Promise<LocalDatabaseState> {
  const raw = localStorage.getItem(DB_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LocalDatabaseState;
      if (parsed && Array.isArray(parsed.users)) {
        return parsed;
      }
    } catch {
      // fall through to seed
    }
  }
  const seeded = await createInitialLocalSeed();
  saveDb(seeded);
  return seeded;
}

function saveDb(db: LocalDatabaseState): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

function saveSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

async function ensureBootstrapped(): Promise<LocalDatabaseState> {
  const db = await loadDb();
  const alreadyBootstrapped = localStorage.getItem(INITIALIZED_FLAG_KEY);
  if (!alreadyBootstrapped && db.users.length > 0 && !readSession()) {
    // On first visit only, start with the primary local demo workspace active so
    // the full dashboard is immediately ready. Once signed out, session stays null.
    const primary = db.users[0];
    saveSession({
      access_token: generateId('local_tok'),
      user_id: primary.profile.id,
      email: primary.profile.email,
      signed_in_at: new Date().toISOString(),
      provider: 'local',
    });
    localStorage.setItem(INITIALIZED_FLAG_KEY, '1');
  }
  return db;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Profile image must be smaller than 2 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to load image file.'));
    reader.readAsDataURL(file);
  });
}

export function createLocalServices(): DayformServices {
  return {
    mode: 'local',
    isCloudConfigured: false,

    auth: {
      async getSession(): Promise<AuthSession | null> {
        const db = await ensureBootstrapped();
        const session = readSession();
        if (!session) return null;
        const userExists = db.users.some((u) => u.profile.id === session.user_id);
        if (!userExists) {
          saveSession(null);
          return null;
        }
        return session;
      },

      async getKnownAccounts(): Promise<KnownAccountHint[]> {
        const db = await ensureBootstrapped();
        return [...db.users]
          .sort((a, b) => b.last_signed_in_at.localeCompare(a.last_signed_in_at))
          .map((u) => ({
            id: u.profile.id,
            display_name: u.profile.display_name,
            email: u.profile.email,
            avatar_url: u.profile.avatar_url,
            last_signed_in_at: u.last_signed_in_at,
          }));
      },

      async signIn(input: SignInInput): Promise<{ session: AuthSession; profile: Profile }> {
        const emailErr = validateEmail(input.email);
        if (emailErr) throw new Error(emailErr);
        if (!input.password) throw new Error('Password is required.');

        const db = await ensureBootstrapped();
        const normalizedEmail = input.email.trim().toLowerCase();
        const userRecord = db.users.find(
          (u) => u.profile.email.toLowerCase() === normalizedEmail,
        );

        if (!userRecord) {
          throw new Error('No account found with that email address.');
        }

        const candidateHash = await hashPassword(input.password, userRecord.salt);
        if (candidateHash !== userRecord.password_hash) {
          throw new Error('Incorrect password. Please try again.');
        }

        const now = new Date().toISOString();
        userRecord.last_signed_in_at = now;
        saveDb(db);

        const session: AuthSession = {
          access_token: generateId('local_tok'),
          user_id: userRecord.profile.id,
          email: userRecord.profile.email,
          signed_in_at: now,
          provider: 'local',
        };
        saveSession(session);
        localStorage.setItem(INITIALIZED_FLAG_KEY, '1');

        return { session, profile: { ...userRecord.profile } };
      },

      async signUp(input: SignUpInput): Promise<{ session: AuthSession; profile: Profile }> {
        const nameErr = validateDisplayName(input.display_name);
        if (nameErr) throw new Error(nameErr);
        const emailErr = validateEmail(input.email);
        if (emailErr) throw new Error(emailErr);
        const pwErr = validatePassword(input.password);
        if (pwErr) throw new Error(pwErr);

        const db = await ensureBootstrapped();
        const normalizedEmail = input.email.trim().toLowerCase();
        const existing = db.users.find(
          (u) => u.profile.email.toLowerCase() === normalizedEmail,
        );
        if (existing) {
          throw new Error('An account with this email already exists. Try signing in.');
        }

        const now = new Date().toISOString();
        const userId = generateId('usr');
        const salt = generateId('salt');
        const passwordHash = await hashPassword(input.password, salt);

        const profile: Profile = {
          id: userId,
          display_name: input.display_name.trim(),
          email: normalizedEmail,
          avatar_url: null,
          created_at: now,
          updated_at: now,
        };

        db.users.push({
          profile,
          salt,
          password_hash: passwordHash,
          reset_token: null,
          reset_token_expires_at: null,
          last_signed_in_at: now,
        });

        // Starter categories for new account
        const workCatId = generateId('cat');
        const personalCatId = generateId('cat');
        db.categories.push(
          {
            id: workCatId,
            user_id: userId,
            name: 'Work',
            color: '#C18C64',
            created_at: now,
          },
          {
            id: personalCatId,
            user_id: userId,
            name: 'Personal',
            color: '#648B72',
            created_at: now,
          },
        );

        // One welcoming starter task so the workspace is immediately actionable
        db.tasks.push({
          id: generateId('tsk'),
          user_id: userId,
          title: 'Set your three priorities for today',
          description:
            'Add due dates, categories, and subtasks to organize your week with calm focus.',
          due_date: getTodayKey(),
          priority: 'medium',
          category_id: personalCatId,
          is_completed: false,
          completed_at: null,
          recurrence: 'none',
          created_at: now,
          updated_at: now,
        });

        db.preferences.push({
          id: generateId('pref'),
          user_id: userId,
          theme: 'light',
          notifications_enabled: true,
          due_date_reminders: true,
          daily_digest: false,
          week_starts_on: 'monday',
          created_at: now,
          updated_at: now,
        });

        saveDb(db);

        const session: AuthSession = {
          access_token: generateId('local_tok'),
          user_id: userId,
          email: normalizedEmail,
          signed_in_at: now,
          provider: 'local',
        };
        saveSession(session);
        localStorage.setItem(INITIALIZED_FLAG_KEY, '1');

        return { session, profile };
      },

      async signOut(): Promise<void> {
        saveSession(null);
      },

      async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
        const emailErr = validateEmail(email);
        if (emailErr) throw new Error(emailErr);

        const db = await ensureBootstrapped();
        const normalizedEmail = email.trim().toLowerCase();
        const userRecord = db.users.find(
          (u) => u.profile.email.toLowerCase() === normalizedEmail,
        );
        if (!userRecord) {
          throw new Error('No local account matches that email address.');
        }

        const token = generateResetToken();
        userRecord.reset_token = token;
        userRecord.reset_token_expires_at = new Date(
          Date.now() + 15 * 60 * 1000,
        ).toISOString();
        saveDb(db);

        return {
          email: normalizedEmail,
          localResetToken: token,
          message:
            'Local development mode: no external email was sent. Use the one-time reset code below to complete your password reset.',
        };
      },

      async resetPassword(
        email: string,
        token: string,
        newPassword: string,
      ): Promise<void> {
        const emailErr = validateEmail(email);
        if (emailErr) throw new Error(emailErr);
        const pwErr = validatePassword(newPassword);
        if (pwErr) throw new Error(pwErr);
        if (!token.trim()) throw new Error('Reset code is required.');

        const db = await ensureBootstrapped();
        const normalizedEmail = email.trim().toLowerCase();
        const userRecord = db.users.find(
          (u) => u.profile.email.toLowerCase() === normalizedEmail,
        );
        if (!userRecord || !userRecord.reset_token) {
          throw new Error('No active password reset request found for this email.');
        }
        if (userRecord.reset_token.toUpperCase() !== token.trim().toUpperCase()) {
          throw new Error('Invalid reset code. Please check the code and try again.');
        }
        if (
          userRecord.reset_token_expires_at &&
          new Date(userRecord.reset_token_expires_at).getTime() < Date.now()
        ) {
          throw new Error('This reset code has expired. Request a new code.');
        }

        const newSalt = generateId('salt');
        userRecord.salt = newSalt;
        userRecord.password_hash = await hashPassword(newPassword, newSalt);
        userRecord.reset_token = null;
        userRecord.reset_token_expires_at = null;
        userRecord.profile.updated_at = new Date().toISOString();
        saveDb(db);
      },

      async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
      ): Promise<void> {
        if (!currentPassword) throw new Error('Enter your current password.');
        const pwErr = validatePassword(newPassword);
        if (pwErr) throw new Error(pwErr);

        const db = await ensureBootstrapped();
        const userRecord = db.users.find((u) => u.profile.id === userId);
        if (!userRecord) throw new Error('Account not found.');

        const currentHash = await hashPassword(currentPassword, userRecord.salt);
        if (currentHash !== userRecord.password_hash) {
          throw new Error('Current password is incorrect.');
        }

        const newSalt = generateId('salt');
        userRecord.salt = newSalt;
        userRecord.password_hash = await hashPassword(newPassword, newSalt);
        userRecord.profile.updated_at = new Date().toISOString();
        saveDb(db);
      },

      async deleteAccount(userId: string, password: string): Promise<void> {
        if (!password) throw new Error('Confirm your password to delete this account.');
        const db = await ensureBootstrapped();
        const userRecord = db.users.find((u) => u.profile.id === userId);
        if (!userRecord) throw new Error('Account not found.');

        const candidateHash = await hashPassword(password, userRecord.salt);
        if (candidateHash !== userRecord.password_hash) {
          throw new Error('Password does not match. Account was not deleted.');
        }

        db.users = db.users.filter((u) => u.profile.id !== userId);
        db.tasks = db.tasks.filter((t) => t.user_id !== userId);
        db.categories = db.categories.filter((c) => c.user_id !== userId);
        db.subtasks = db.subtasks.filter((s) => s.user_id !== userId);
        db.preferences = db.preferences.filter((p) => p.user_id !== userId);
        saveDb(db);
        saveSession(null);
      },
    },

    profiles: {
      async getProfile(userId: string): Promise<Profile | null> {
        const db = await ensureBootstrapped();
        const record = db.users.find((u) => u.profile.id === userId);
        return record ? { ...record.profile } : null;
      },

      async updateProfile(userId, updates): Promise<Profile> {
        const db = await ensureBootstrapped();
        const record = db.users.find((u) => u.profile.id === userId);
        if (!record) throw new Error('Profile not found.');

        if (updates.display_name !== undefined) {
          const nameErr = validateDisplayName(updates.display_name);
          if (nameErr) throw new Error(nameErr);
          record.profile.display_name = updates.display_name.trim();
        }

        if (updates.email !== undefined) {
          const emailErr = validateEmail(updates.email);
          if (emailErr) throw new Error(emailErr);
          const normalized = updates.email.trim().toLowerCase();
          const conflict = db.users.find(
            (u) =>
              u.profile.id !== userId &&
              u.profile.email.toLowerCase() === normalized,
          );
          if (conflict) {
            throw new Error('That email address is already registered to another account.');
          }
          record.profile.email = normalized;

          const currentSession = readSession();
          if (currentSession && currentSession.user_id === userId) {
            saveSession({ ...currentSession, email: normalized });
          }
        }

        if (updates.avatar_url !== undefined) {
          record.profile.avatar_url = updates.avatar_url;
        }

        record.profile.updated_at = new Date().toISOString();
        saveDb(db);
        return { ...record.profile };
      },

      async uploadAvatar(userId: string, file: File): Promise<string> {
        const dataUrl = await fileToDataUrl(file);
        await this.updateProfile(userId, { avatar_url: dataUrl });
        return dataUrl;
      },
    },

    tasks: {
      async listTasks(userId: string): Promise<Task[]> {
        const db = await ensureBootstrapped();
        return db.tasks
          .filter((t) => t.user_id === userId)
          .map((t) => ({ ...t }));
      },

      async createTask(
        userId: string,
        input: CreateTaskInput,
      ): Promise<{ task: Task; subtasks: Subtask[] }> {
        const titleErr = validateTaskTitle(input.title);
        if (titleErr) throw new Error(titleErr);

        const db = await ensureBootstrapped();
        const now = new Date().toISOString();
        const task: Task = {
          id: generateId('tsk'),
          user_id: userId,
          title: input.title.trim(),
          description: (input.description || '').trim(),
          due_date: input.due_date || null,
          priority: input.priority || 'medium',
          category_id: input.category_id || null,
          is_completed: false,
          completed_at: null,
          recurrence: input.recurrence || 'none',
          created_at: now,
          updated_at: now,
        };

        db.tasks.unshift(task);

        const createdSubtasks: Subtask[] = [];
        for (const rawSub of input.subtasks || []) {
          const clean = rawSub.trim();
          if (!clean) continue;
          const sub: Subtask = {
            id: generateId('sub'),
            task_id: task.id,
            user_id: userId,
            title: clean,
            is_completed: false,
            created_at: now,
          };
          db.subtasks.push(sub);
          createdSubtasks.push(sub);
        }

        saveDb(db);
        return { task: { ...task }, subtasks: createdSubtasks };
      },

      async updateTask(
        userId: string,
        taskId: string,
        updates: UpdateTaskInput,
      ): Promise<Task> {
        const db = await ensureBootstrapped();
        const task = db.tasks.find((t) => t.id === taskId && t.user_id === userId);
        if (!task) throw new Error('Task not found.');

        if (updates.title !== undefined) {
          const titleErr = validateTaskTitle(updates.title);
          if (titleErr) throw new Error(titleErr);
          task.title = updates.title.trim();
        }
        if (updates.description !== undefined) {
          task.description = updates.description.trim();
        }
        if (updates.due_date !== undefined) {
          task.due_date = updates.due_date;
        }
        if (updates.priority !== undefined) {
          task.priority = updates.priority;
        }
        if (updates.category_id !== undefined) {
          task.category_id = updates.category_id;
        }
        if (updates.recurrence !== undefined) {
          task.recurrence = updates.recurrence;
        }
        if (updates.is_completed !== undefined) {
          task.is_completed = updates.is_completed;
          task.completed_at = updates.is_completed
            ? updates.completed_at || new Date().toISOString()
            : null;
        }
        task.updated_at = new Date().toISOString();
        saveDb(db);
        return { ...task };
      },

      async toggleTaskCompletion(
        userId: string,
        taskId: string,
      ): Promise<{ updatedTask: Task; nextRecurringTask: Task | null }> {
        const db = await ensureBootstrapped();
        const task = db.tasks.find((t) => t.id === taskId && t.user_id === userId);
        if (!task) throw new Error('Task not found.');

        const now = new Date().toISOString();
        const nextCompleted = !task.is_completed;
        task.is_completed = nextCompleted;
        task.completed_at = nextCompleted ? now : null;
        task.updated_at = now;

        let nextRecurringTask: Task | null = null;
        if (nextCompleted && task.recurrence !== 'none') {
          const nextDue = getNextRecurringDueDate(
            task.due_date,
            task.recurrence,
            getTodayKey(),
          );
          if (nextDue) {
            nextRecurringTask = {
              id: generateId('tsk'),
              user_id: userId,
              title: task.title,
              description: task.description,
              due_date: nextDue,
              priority: task.priority,
              category_id: task.category_id,
              is_completed: false,
              completed_at: null,
              recurrence: task.recurrence,
              created_at: now,
              updated_at: now,
            };
            db.tasks.unshift(nextRecurringTask);
          }
        }

        saveDb(db);
        return {
          updatedTask: { ...task },
          nextRecurringTask: nextRecurringTask ? { ...nextRecurringTask } : null,
        };
      },

      async deleteTask(userId: string, taskId: string): Promise<void> {
        const db = await ensureBootstrapped();
        db.tasks = db.tasks.filter((t) => !(t.id === taskId && t.user_id === userId));
        db.subtasks = db.subtasks.filter(
          (s) => !(s.task_id === taskId && s.user_id === userId),
        );
        saveDb(db);
      },
    },

    categories: {
      async listCategories(userId: string): Promise<Category[]> {
        const db = await ensureBootstrapped();
        return db.categories
          .filter((c) => c.user_id === userId)
          .map((c) => ({ ...c }));
      },

      async createCategory(
        userId: string,
        name: string,
        color: string,
      ): Promise<Category> {
        const clean = name.trim();
        if (!clean) throw new Error('Category name is required.');
        if (clean.length > 36) throw new Error('Category name must be under 36 characters.');

        const db = await ensureBootstrapped();
        const duplicate = db.categories.find(
          (c) =>
            c.user_id === userId && c.name.toLowerCase() === clean.toLowerCase(),
        );
        if (duplicate) {
          throw new Error('A category with that name already exists.');
        }

        const cat: Category = {
          id: generateId('cat'),
          user_id: userId,
          name: clean,
          color: color || '#C18C64',
          created_at: new Date().toISOString(),
        };
        db.categories.push(cat);
        saveDb(db);
        return { ...cat };
      },

      async updateCategory(userId, categoryId, updates): Promise<Category> {
        const db = await ensureBootstrapped();
        const cat = db.categories.find(
          (c) => c.id === categoryId && c.user_id === userId,
        );
        if (!cat) throw new Error('Category not found.');

        if (updates.name !== undefined) {
          const clean = updates.name.trim();
          if (!clean) throw new Error('Category name is required.');
          cat.name = clean;
        }
        if (updates.color !== undefined) {
          cat.color = updates.color;
        }
        saveDb(db);
        return { ...cat };
      },

      async deleteCategory(userId: string, categoryId: string): Promise<void> {
        const db = await ensureBootstrapped();
        db.categories = db.categories.filter(
          (c) => !(c.id === categoryId && c.user_id === userId),
        );
        // Detach category from tasks cleanly (mirrors ON DELETE SET NULL)
        for (const task of db.tasks) {
          if (task.user_id === userId && task.category_id === categoryId) {
            task.category_id = null;
          }
        }
        saveDb(db);
      },
    },

    subtasks: {
      async listSubtasks(userId: string): Promise<Subtask[]> {
        const db = await ensureBootstrapped();
        return db.subtasks
          .filter((s) => s.user_id === userId)
          .map((s) => ({ ...s }));
      },

      async createSubtask(
        userId: string,
        taskId: string,
        title: string,
      ): Promise<Subtask> {
        const clean = title.trim();
        if (!clean) throw new Error('Subtask title cannot be empty.');
        const db = await ensureBootstrapped();
        const taskExists = db.tasks.some(
          (t) => t.id === taskId && t.user_id === userId,
        );
        if (!taskExists) throw new Error('Parent task not found.');

        const sub: Subtask = {
          id: generateId('sub'),
          task_id: taskId,
          user_id: userId,
          title: clean,
          is_completed: false,
          created_at: new Date().toISOString(),
        };
        db.subtasks.push(sub);
        saveDb(db);
        return { ...sub };
      },

      async toggleSubtask(userId: string, subtaskId: string): Promise<Subtask> {
        const db = await ensureBootstrapped();
        const sub = db.subtasks.find(
          (s) => s.id === subtaskId && s.user_id === userId,
        );
        if (!sub) throw new Error('Subtask not found.');
        sub.is_completed = !sub.is_completed;
        saveDb(db);
        return { ...sub };
      },

      async deleteSubtask(userId: string, subtaskId: string): Promise<void> {
        const db = await ensureBootstrapped();
        db.subtasks = db.subtasks.filter(
          (s) => !(s.id === subtaskId && s.user_id === userId),
        );
        saveDb(db);
      },
    },

    preferences: {
      async getPreferences(userId: string): Promise<UserPreferences> {
        const db = await ensureBootstrapped();
        let pref = db.preferences.find((p) => p.user_id === userId);
        if (!pref) {
          const now = new Date().toISOString();
          pref = {
            id: generateId('pref'),
            user_id: userId,
            theme: 'light',
            notifications_enabled: true,
            due_date_reminders: true,
            daily_digest: false,
            week_starts_on: 'monday',
            created_at: now,
            updated_at: now,
          };
          db.preferences.push(pref);
          saveDb(db);
        }
        return { ...pref };
      },

      async updatePreferences(userId, updates): Promise<UserPreferences> {
        const db = await ensureBootstrapped();
        let pref = db.preferences.find((p) => p.user_id === userId);
        const now = new Date().toISOString();
        if (!pref) {
          pref = {
            id: generateId('pref'),
            user_id: userId,
            theme: 'light',
            notifications_enabled: true,
            due_date_reminders: true,
            daily_digest: false,
            week_starts_on: 'monday',
            created_at: now,
            updated_at: now,
          };
          db.preferences.push(pref);
        }

        Object.assign(pref, updates, { updated_at: now });
        saveDb(db);
        return { ...pref };
      },
    },
  };
}
