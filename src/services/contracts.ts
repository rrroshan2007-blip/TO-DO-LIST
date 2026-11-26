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
} from '../types/models';

export interface SignUpInput {
  display_name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface PasswordResetRequestResult {
  email: string;
  localResetToken?: string;
  message: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  getKnownAccounts(): Promise<KnownAccountHint[]>;
  signIn(input: SignInInput): Promise<{ session: AuthSession; profile: Profile }>;
  signUp(input: SignUpInput): Promise<{ session: AuthSession; profile: Profile }>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  resetPassword(email: string, token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  deleteAccount(userId: string, password: string): Promise<void>;
}

export interface ProfileService {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'display_name' | 'email' | 'avatar_url'>>,
  ): Promise<Profile>;
  uploadAvatar(userId: string, file: File): Promise<string>;
}

export interface TaskService {
  listTasks(userId: string): Promise<Task[]>;
  createTask(userId: string, input: CreateTaskInput): Promise<{ task: Task; subtasks: Subtask[] }>;
  updateTask(userId: string, taskId: string, updates: UpdateTaskInput): Promise<Task>;
  toggleTaskCompletion(
    userId: string,
    taskId: string,
  ): Promise<{ updatedTask: Task; nextRecurringTask: Task | null }>;
  deleteTask(userId: string, taskId: string): Promise<void>;
}

export interface CategoryService {
  listCategories(userId: string): Promise<Category[]>;
  createCategory(userId: string, name: string, color: string): Promise<Category>;
  updateCategory(
    userId: string,
    categoryId: string,
    updates: Partial<Pick<Category, 'name' | 'color'>>,
  ): Promise<Category>;
  deleteCategory(userId: string, categoryId: string): Promise<void>;
}

export interface SubtaskService {
  listSubtasks(userId: string): Promise<Subtask[]>;
  createSubtask(userId: string, taskId: string, title: string): Promise<Subtask>;
  toggleSubtask(userId: string, subtaskId: string): Promise<Subtask>;
  deleteSubtask(userId: string, subtaskId: string): Promise<void>;
}

export interface PreferencesService {
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(
    userId: string,
    updates: Partial<
      Pick<
        UserPreferences,
        'theme' | 'notifications_enabled' | 'due_date_reminders' | 'daily_digest' | 'week_starts_on'
      >
    >,
  ): Promise<UserPreferences>;
}

export interface DayformServices {
  mode: 'local' | 'supabase';
  isCloudConfigured: boolean;
  auth: AuthService;
  profiles: ProfileService;
  tasks: TaskService;
  categories: CategoryService;
  subtasks: SubtaskService;
  preferences: PreferencesService;
}
