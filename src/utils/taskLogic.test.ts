import test from 'node:test';
import assert from 'node:assert/strict';
import type { Task } from '../types/models';
import {
  buildCalendarMonthGrid,
  computeTaskMetrics,
  computeWeeklyCompletion,
  filterAndSortTasks,
  getNextRecurringDueDate,
  getTimeGreeting,
  groupUpcomingTasks,
  isTaskOverdue,
} from './taskLogic';
import { validateEmail, validatePassword } from './validation';

const sampleTasks: Task[] = [
  {
    id: '1',
    user_id: 'u1',
    title: 'Finalize studio lighting brief',
    description: 'Confirm travertine samples',
    due_date: '2026-11-25',
    priority: 'high',
    category_id: 'cat-work',
    is_completed: false,
    completed_at: null,
    recurrence: 'none',
    created_at: '2026-11-20T09:00:00.000Z',
    updated_at: '2026-11-20T09:00:00.000Z',
  },
  {
    id: '2',
    user_id: 'u1',
    title: 'Send quarterly retainer invoice',
    description: 'Attach updated milestone log',
    due_date: '2026-11-23',
    priority: 'high',
    category_id: 'cat-finance',
    is_completed: false,
    completed_at: null,
    recurrence: 'monthly',
    created_at: '2026-11-18T09:00:00.000Z',
    updated_at: '2026-11-18T09:00:00.000Z',
  },
  {
    id: '3',
    user_id: 'u1',
    title: 'Morning architectural walk',
    description: '45 minutes without phone',
    due_date: '2026-11-25',
    priority: 'low',
    category_id: 'cat-personal',
    is_completed: true,
    completed_at: '2026-11-25T08:15:00.000Z',
    recurrence: 'daily',
    created_at: '2026-11-21T07:00:00.000Z',
    updated_at: '2026-11-25T08:15:00.000Z',
  },
  {
    id: '4',
    user_id: 'u1',
    title: 'Review client feedback deck',
    description: 'Prepare revision notes',
    due_date: '2026-11-26',
    priority: 'medium',
    category_id: 'cat-work',
    is_completed: false,
    completed_at: null,
    recurrence: 'none',
    created_at: '2026-11-22T10:00:00.000Z',
    updated_at: '2026-11-22T10:00:00.000Z',
  },
  {
    id: '5',
    user_id: 'u1',
    title: 'Plan winter reading list',
    description: 'Collect typography monographs',
    due_date: '2026-12-08',
    priority: 'low',
    category_id: 'cat-personal',
    is_completed: false,
    completed_at: null,
    recurrence: 'none',
    created_at: '2026-11-19T10:00:00.000Z',
    updated_at: '2026-11-19T10:00:00.000Z',
  },
];

test('computeTaskMetrics calculates totals, overdue, and today progress accurately', () => {
  const metrics = computeTaskMetrics(sampleTasks, '2026-11-25');
  assert.equal(metrics.total, 5);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.pending, 4);
  assert.equal(metrics.overdue, 1);
  assert.equal(metrics.todayTotal, 2);
  assert.equal(metrics.todayCompleted, 1);
  assert.equal(metrics.todayProgressPct, 50);
});

test('isTaskOverdue ignores completed tasks and future tasks', () => {
  assert.equal(isTaskOverdue(sampleTasks[1], '2026-11-25'), true);
  assert.equal(isTaskOverdue(sampleTasks[0], '2026-11-25'), false);
  assert.equal(isTaskOverdue(sampleTasks[2], '2026-11-25'), false);
});

test('filterAndSortTasks filters by search, status, priority, category, and sorts correctly', () => {
  const workHigh = filterAndSortTasks(sampleTasks, {
    categoryId: 'cat-work',
    priority: 'high',
    status: 'active',
  });
  assert.equal(workHigh.length, 1);
  assert.equal(workHigh[0].id, '1');

  const searchRes = filterAndSortTasks(sampleTasks, { search: 'retainer' });
  assert.equal(searchRes.length, 1);
  assert.equal(searchRes[0].id, '2');

  const sortedByPriorityDesc = filterAndSortTasks(sampleTasks, {
    sortBy: 'priority',
    sortDir: 'desc',
  });
  assert.equal(sortedByPriorityDesc[0].priority, 'high');
  assert.equal(sortedByPriorityDesc[sortedByPriorityDesc.length - 1].priority, 'low');
});

test('getNextRecurringDueDate advances daily, weekdays, weekly, and monthly cleanly', () => {
  assert.equal(getNextRecurringDueDate('2026-11-25', 'daily', '2026-11-25'), '2026-11-26');
  // 2026-11-27 is a Friday -> next weekday is Monday 2026-11-30
  assert.equal(getNextRecurringDueDate('2026-11-27', 'weekdays', '2026-11-25'), '2026-11-30');
  assert.equal(getNextRecurringDueDate('2026-11-25', 'weekly', '2026-11-25'), '2026-12-02');
  // Jan 31 -> Feb 28 (non-leap year 2026)
  assert.equal(getNextRecurringDueDate('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(getNextRecurringDueDate('2026-11-25', 'none', '2026-11-25'), null);
});

test('buildCalendarMonthGrid returns 42 aligned cells', () => {
  const cells = buildCalendarMonthGrid(2026, 10, 'monday'); // Nov 2026
  assert.equal(cells.length, 42);
  const novDays = cells.filter((c) => c.inCurrentMonth);
  assert.equal(novDays.length, 30);
  assert.equal(novDays[0].dateKey, '2026-11-01');
  assert.equal(novDays[29].dateKey, '2026-11-30');
});

test('computeWeeklyCompletion returns 7 days ending today with accurate completion counts', () => {
  const points = computeWeeklyCompletion(sampleTasks, '2026-11-25');
  assert.equal(points.length, 7);
  assert.equal(points[6].isToday, true);
  assert.equal(points[6].completedCount, 1);
});

test('groupUpcomingTasks groups tomorrow and later chronologically', () => {
  const groups = groupUpcomingTasks(sampleTasks, '2026-11-25');
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Tomorrow');
  assert.equal(groups[0].tasks[0].id, '4');
  assert.equal(groups[1].label, 'Later');
  assert.equal(groups[1].tasks[0].id, '5');
});

test('time greeting and auth validators enforce strict rules', () => {
  assert.equal(getTimeGreeting(new Date(2026, 10, 25, 9, 0)), 'Good morning');
  assert.equal(getTimeGreeting(new Date(2026, 10, 25, 14, 0)), 'Good afternoon');
  assert.equal(getTimeGreeting(new Date(2026, 10, 25, 20, 0)), 'Good evening');

  assert.equal(validateEmail('clara@dayform.app'), null);
  assert.notEqual(validateEmail('invalid-email'), null);

  assert.equal(validatePassword('Dayform2026!'), null);
  assert.notEqual(validatePassword('short1'), null);
  assert.notEqual(validatePassword('onlyletters'), null);
});
