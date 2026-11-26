import { BRAND } from '../../config/brand';
import type {
  Category,
  Profile,
  Subtask,
  Task,
  UserPreferences,
} from '../../types/models';
import { addDaysToKey, getTodayKey } from '../../utils/taskLogic';
import { hashPassword } from './crypto';

export interface LocalUserRecord {
  profile: Profile;
  salt: string;
  password_hash: string;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  last_signed_in_at: string;
}

export interface LocalDatabaseState {
  version: number;
  users: LocalUserRecord[];
  categories: Category[];
  tasks: Task[];
  subtasks: Subtask[];
  preferences: UserPreferences[];
}

export const CATEGORY_COLOR_SWATCHES = [
  { name: 'Copper', hex: '#C18C64' },
  { name: 'Sage', hex: '#648B72' },
  { name: 'Graphite', hex: '#5A6472' },
  { name: 'Ochre', hex: '#D5A15E' },
  { name: 'Terracotta', hex: '#C96F68' },
  { name: 'Stone', hex: '#8F8578' },
] as const;

export const DEMO_ACCOUNTS_HINT = [
  {
    name: 'Clara Vance',
    email: 'clara@dayform.app',
    passwordHint: 'Dayform2026!',
  },
  {
    name: 'Marcus Chen',
    email: 'marcus@dayform.app',
    passwordHint: 'Studio2026!',
  },
] as const;

function isoAtDaysOffset(todayKey: string, dayOffset: number, hour = 10): string {
  const key = addDaysToKey(todayKey, dayOffset);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 30, 0, 0).toISOString();
}

export async function createInitialLocalSeed(): Promise<LocalDatabaseState> {
  const today = getTodayKey();
  const claraId = 'usr_clara_vance';
  const marcusId = 'usr_marcus_chen';

  const claraSalt = 'df_salt_clara_01';
  const marcusSalt = 'df_salt_marcus_02';
  const [claraHash, marcusHash] = await Promise.all([
    hashPassword('Dayform2026!', claraSalt),
    hashPassword('Studio2026!', marcusSalt),
  ]);

  const users: LocalUserRecord[] = [
    {
      profile: {
        id: claraId,
        display_name: 'Clara Vance',
        email: 'clara@dayform.app',
        avatar_url: BRAND.assets.claraAvatar,
        created_at: isoAtDaysOffset(today, -94, 9),
        updated_at: isoAtDaysOffset(today, -2, 14),
      },
      salt: claraSalt,
      password_hash: claraHash,
      reset_token: null,
      reset_token_expires_at: null,
      last_signed_in_at: new Date().toISOString(),
    },
    {
      profile: {
        id: marcusId,
        display_name: 'Marcus Chen',
        email: 'marcus@dayform.app',
        avatar_url: BRAND.assets.marcusAvatar,
        created_at: isoAtDaysOffset(today, -58, 11),
        updated_at: isoAtDaysOffset(today, -5, 16),
      },
      salt: marcusSalt,
      password_hash: marcusHash,
      reset_token: null,
      reset_token_expires_at: null,
      last_signed_in_at: isoAtDaysOffset(today, -3, 18),
    },
  ];

  const categories: Category[] = [
    // Clara's categories
    {
      id: 'cat_clara_studio',
      user_id: claraId,
      name: 'Studio Work',
      color: '#C18C64',
      created_at: isoAtDaysOffset(today, -90, 9),
    },
    {
      id: 'cat_clara_planning',
      user_id: claraId,
      name: 'Strategy',
      color: '#5A6472',
      created_at: isoAtDaysOffset(today, -88, 9),
    },
    {
      id: 'cat_clara_personal',
      user_id: claraId,
      name: 'Personal',
      color: '#648B72',
      created_at: isoAtDaysOffset(today, -85, 9),
    },
    {
      id: 'cat_clara_admin',
      user_id: claraId,
      name: 'Finance & Admin',
      color: '#D5A15E',
      created_at: isoAtDaysOffset(today, -80, 9),
    },
    // Marcus's categories
    {
      id: 'cat_marcus_product',
      user_id: marcusId,
      name: 'Product Design',
      color: '#C18C64',
      created_at: isoAtDaysOffset(today, -50, 9),
    },
    {
      id: 'cat_marcus_research',
      user_id: marcusId,
      name: 'Research',
      color: '#648B72',
      created_at: isoAtDaysOffset(today, -45, 9),
    },
  ];

  const tasks: Task[] = [
    // Clara — Today (Active)
    {
      id: 'tsk_clara_1',
      user_id: claraId,
      title: 'Finalize lighting & material board for Kyoto residence',
      description:
        'Confirm brushed bronze fixtures, honed travertine swatches, and acoustic plaster samples before sending the client package.',
      due_date: today,
      priority: 'high',
      category_id: 'cat_clara_studio',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -4, 9),
      updated_at: isoAtDaysOffset(today, -1, 15),
    },
    {
      id: 'tsk_clara_2',
      user_id: claraId,
      title: 'Prepare Q4 studio capacity review',
      description:
        'Summarize billable studio hours, upcoming milestone commitments, and contractor bandwidth for Thursday partner sync.',
      due_date: today,
      priority: 'medium',
      category_id: 'cat_clara_planning',
      is_completed: false,
      completed_at: null,
      recurrence: 'weekly',
      created_at: isoAtDaysOffset(today, -3, 11),
      updated_at: isoAtDaysOffset(today, -1, 16),
    },
    {
      id: 'tsk_clara_3',
      user_id: claraId,
      title: 'Pick up linen archival portfolio binders',
      description: 'Order #4819 ready at Paper & Press on Valencia Street before 5:30 PM.',
      due_date: today,
      priority: 'low',
      category_id: 'cat_clara_personal',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -2, 13),
      updated_at: isoAtDaysOffset(today, -1, 9),
    },
    // Clara — Today (Completed)
    {
      id: 'tsk_clara_4',
      user_id: claraId,
      title: 'Review structural elevation markups with Elena',
      description: 'Walk through staircase landing clearance and north skylight framing details.',
      due_date: today,
      priority: 'high',
      category_id: 'cat_clara_studio',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, 0, 9),
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -3, 8),
      updated_at: isoAtDaysOffset(today, 0, 9),
    },
    {
      id: 'tsk_clara_5',
      user_id: claraId,
      title: 'Morning stillness & journal check-in',
      description: 'Write top three priorities before opening email.',
      due_date: today,
      priority: 'low',
      category_id: 'cat_clara_personal',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, 0, 7),
      recurrence: 'daily',
      created_at: isoAtDaysOffset(today, -12, 7),
      updated_at: isoAtDaysOffset(today, 0, 7),
    },
    // Clara — Overdue
    {
      id: 'tsk_clara_6',
      user_id: claraId,
      title: 'Approve November contractor retainers',
      description: 'Cross-check lighting consultant and CAD drafter hours prior to payroll export.',
      due_date: addDaysToKey(today, -2),
      priority: 'high',
      category_id: 'cat_clara_admin',
      is_completed: false,
      completed_at: null,
      recurrence: 'monthly',
      created_at: isoAtDaysOffset(today, -8, 10),
      updated_at: isoAtDaysOffset(today, -3, 14),
    },
    {
      id: 'tsk_clara_7',
      user_id: claraId,
      title: 'Renew studio liability certificate',
      description: 'Download updated PDF policy endorsement and share with building management.',
      due_date: addDaysToKey(today, -1),
      priority: 'medium',
      category_id: 'cat_clara_admin',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -10, 12),
      updated_at: isoAtDaysOffset(today, -2, 10),
    },
    // Clara — Upcoming
    {
      id: 'tsk_clara_8',
      user_id: claraId,
      title: 'Client walkthrough: Northlight Gallery annex',
      description: 'Bring printed A3 floorplans and daylighting simulation snapshots.',
      due_date: addDaysToKey(today, 1),
      priority: 'high',
      category_id: 'cat_clara_studio',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -5, 11),
      updated_at: isoAtDaysOffset(today, -1, 12),
    },
    {
      id: 'tsk_clara_9',
      user_id: claraId,
      title: 'Draft editorial notes for winter monograph',
      description: 'Outline three essays covering tactile timber joinery and passive solar cooling.',
      due_date: addDaysToKey(today, 3),
      priority: 'medium',
      category_id: 'cat_clara_planning',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -4, 15),
      updated_at: isoAtDaysOffset(today, -2, 16),
    },
    {
      id: 'tsk_clara_10',
      user_id: claraId,
      title: 'Schedule dental checkup & annual lab panel',
      description: 'Book morning slots on a Tuesday.',
      due_date: addDaysToKey(today, 5),
      priority: 'low',
      category_id: 'cat_clara_personal',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -6, 17),
      updated_at: isoAtDaysOffset(today, -6, 17),
    },
    {
      id: 'tsk_clara_11',
      user_id: claraId,
      title: 'Prepare 2027 design residency applications',
      description: 'Curate six built projects with photography credits and concise statements.',
      due_date: addDaysToKey(today, 11),
      priority: 'medium',
      category_id: 'cat_clara_planning',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -7, 14),
      updated_at: isoAtDaysOffset(today, -3, 10),
    },
    // Clara — Completed in past week (populates Weekly Productivity realistically)
    {
      id: 'tsk_clara_12',
      user_id: claraId,
      title: 'Publish updated design token guidelines',
      description: 'Standardized spacing scale and warm neutral color ratios across decks.',
      due_date: addDaysToKey(today, -1),
      priority: 'medium',
      category_id: 'cat_clara_studio',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -1, 16),
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -5, 9),
      updated_at: isoAtDaysOffset(today, -1, 16),
    },
    {
      id: 'tsk_clara_13',
      user_id: claraId,
      title: 'Archive October project receipts',
      description: 'Reconciled studio supply expenses and shared folder with accountant.',
      due_date: addDaysToKey(today, -1),
      priority: 'low',
      category_id: 'cat_clara_admin',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -1, 11),
      recurrence: 'monthly',
      created_at: isoAtDaysOffset(today, -6, 10),
      updated_at: isoAtDaysOffset(today, -1, 11),
    },
    {
      id: 'tsk_clara_14',
      user_id: claraId,
      title: 'Refine courtyard landscaping planting schedule',
      description: 'Selected olive trees, rosemary groundcover, and gravel drainage.',
      due_date: addDaysToKey(today, -2),
      priority: 'medium',
      category_id: 'cat_clara_studio',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -2, 15),
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -7, 10),
      updated_at: isoAtDaysOffset(today, -2, 15),
    },
    {
      id: 'tsk_clara_15',
      user_id: claraId,
      title: 'Weekly studio retrospective & inbox zero',
      description: 'Cleared client threads and updated milestone tracker.',
      due_date: addDaysToKey(today, -3),
      priority: 'medium',
      category_id: 'cat_clara_planning',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -3, 17),
      recurrence: 'weekly',
      created_at: isoAtDaysOffset(today, -9, 9),
      updated_at: isoAtDaysOffset(today, -3, 17),
    },
    {
      id: 'tsk_clara_16',
      user_id: claraId,
      title: 'Audit acoustic wall panel supplier quotes',
      description: 'Compared lead times across three domestic timber mills.',
      due_date: addDaysToKey(today, -4),
      priority: 'high',
      category_id: 'cat_clara_studio',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -4, 14),
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -10, 11),
      updated_at: isoAtDaysOffset(today, -4, 14),
    },
    {
      id: 'tsk_clara_17',
      user_id: claraId,
      title: 'Sunday long run along Presidio trail',
      description: '8km steady pace before brunch.',
      due_date: addDaysToKey(today, -5),
      priority: 'low',
      category_id: 'cat_clara_personal',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, -5, 9),
      recurrence: 'weekly',
      created_at: isoAtDaysOffset(today, -12, 8),
      updated_at: isoAtDaysOffset(today, -5, 9),
    },

    // Marcus's completely separate workspace tasks
    {
      id: 'tsk_marcus_1',
      user_id: marcusId,
      title: 'Synthesize onboarding usability interviews',
      description: 'Group recurring navigation friction points from six customer calls.',
      due_date: today,
      priority: 'high',
      category_id: 'cat_marcus_research',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -2, 10),
      updated_at: isoAtDaysOffset(today, -1, 14),
    },
    {
      id: 'tsk_marcus_2',
      user_id: marcusId,
      title: 'Polish dark mode elevation tokens',
      description: 'Verify WCAG AA contrast on muted labels across settings modals.',
      due_date: addDaysToKey(today, 2),
      priority: 'medium',
      category_id: 'cat_marcus_product',
      is_completed: false,
      completed_at: null,
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -3, 12),
      updated_at: isoAtDaysOffset(today, -1, 12),
    },
    {
      id: 'tsk_marcus_3',
      user_id: marcusId,
      title: 'Ship sprint typography audit',
      description: 'Replaced inconsistent heading scales on mobile views.',
      due_date: today,
      priority: 'medium',
      category_id: 'cat_marcus_product',
      is_completed: true,
      completed_at: isoAtDaysOffset(today, 0, 10),
      recurrence: 'none',
      created_at: isoAtDaysOffset(today, -4, 9),
      updated_at: isoAtDaysOffset(today, 0, 10),
    },
  ];

  const subtasks: Subtask[] = [
    {
      id: 'sub_1',
      task_id: 'tsk_clara_1',
      user_id: claraId,
      title: 'Verify warm 2700K pendant dimming spec',
      is_completed: true,
      created_at: isoAtDaysOffset(today, -3, 10),
    },
    {
      id: 'sub_2',
      task_id: 'tsk_clara_1',
      user_id: claraId,
      title: 'Photograph honed travertine under north daylight',
      is_completed: false,
      created_at: isoAtDaysOffset(today, -3, 11),
    },
    {
      id: 'sub_3',
      task_id: 'tsk_clara_1',
      user_id: claraId,
      title: 'Export print-ready PDF presentation board',
      is_completed: false,
      created_at: isoAtDaysOffset(today, -2, 9),
    },
    {
      id: 'sub_4',
      task_id: 'tsk_clara_2',
      user_id: claraId,
      title: 'Export October-November utilization spreadsheet',
      is_completed: true,
      created_at: isoAtDaysOffset(today, -2, 12),
    },
    {
      id: 'sub_5',
      task_id: 'tsk_clara_2',
      user_id: claraId,
      title: 'Confirm Q1 availability with freelance 3D artist',
      is_completed: false,
      created_at: isoAtDaysOffset(today, -1, 14),
    },
    {
      id: 'sub_6',
      task_id: 'tsk_clara_8',
      user_id: claraId,
      title: 'Plot two A3 floorplan sets',
      is_completed: false,
      created_at: isoAtDaysOffset(today, -2, 15),
    },
    {
      id: 'sub_7',
      task_id: 'tsk_marcus_1',
      user_id: marcusId,
      title: 'Tag key quotes from participants 4 through 6',
      is_completed: false,
      created_at: isoAtDaysOffset(today, -1, 10),
    },
  ];

  const preferences: UserPreferences[] = [
    {
      id: 'pref_clara',
      user_id: claraId,
      theme: 'light',
      notifications_enabled: true,
      due_date_reminders: true,
      daily_digest: true,
      week_starts_on: 'monday',
      created_at: isoAtDaysOffset(today, -94, 9),
      updated_at: isoAtDaysOffset(today, -2, 14),
    },
    {
      id: 'pref_marcus',
      user_id: marcusId,
      theme: 'dark',
      notifications_enabled: true,
      due_date_reminders: true,
      daily_digest: false,
      week_starts_on: 'sunday',
      created_at: isoAtDaysOffset(today, -58, 11),
      updated_at: isoAtDaysOffset(today, -5, 16),
    },
  ];

  return {
    version: 1,
    users,
    categories,
    tasks,
    subtasks,
    preferences,
  };
}
