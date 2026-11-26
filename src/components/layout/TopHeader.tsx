import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavView, Profile, SettingsTab, Task } from '../../types/models';
import {
  formatReadableDate,
  formatShortDueDate,
  getTimeGreeting,
  isTaskOverdue,
} from '../../utils/taskLogic';
import { Avatar } from '../ui/Avatar';

interface TopHeaderProps {
  activeView: NavView;
  profile: Profile;
  tasks: Task[];
  todayKey: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileNav: () => void;
  onNewTask: () => void;
  onNavigate: (view: NavView) => void;
  onNavigateSettings: (tab: SettingsTab) => void;
}

const VIEW_HEADERS: Record<
  Exclude<NavView, 'overview'>,
  { title: string; subtitle: string }
> = {
  tasks: {
    title: 'My Tasks',
    subtitle: 'Search, filter, and organize everything across your workspace.',
  },
  today: {
    title: 'Today',
    subtitle: 'Focus on what deserves your attention before the day ends.',
  },
  upcoming: {
    title: 'Upcoming',
    subtitle: 'Your scheduled commitments in chronological order.',
  },
  calendar: {
    title: 'Calendar',
    subtitle: 'Plan deadlines across the month and review each day’s workload.',
  },
  completed: {
    title: 'Completed',
    subtitle: 'Finished work, preserved with completion timestamps.',
  },
  overdue: {
    title: 'Overdue',
    subtitle: 'Past-due items ready to finish or reschedule.',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Organize tasks into focused areas of work and life.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your profile, security, theme, and workspace preferences.',
  },
};

export function TopHeader({
  activeView,
  profile,
  tasks,
  todayKey,
  searchQuery,
  onSearchChange,
  onOpenMobileNav,
  onNewTask,
  onNavigate,
  onNavigateSettings,
}: TopHeaderProps) {
  const {
    effectiveTheme,
    setTheme,
    preferences,
    dismissedNotificationIds,
    dismissNotification,
    clearAllNotifications,
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen]);

  const notifications = useMemo(() => {
    if (preferences && !preferences.notifications_enabled) {
      return [];
    }
    const items: {
      id: string;
      kind: 'overdue' | 'today';
      title: string;
      detail: string;
      targetView: NavView;
    }[] = [];

    for (const task of tasks) {
      if (task.is_completed) continue;
      if (isTaskOverdue(task, todayKey)) {
        const id = `overdue_${task.id}`;
        if (!dismissedNotificationIds.includes(id)) {
          items.push({
            id,
            kind: 'overdue',
            title: task.title,
            detail: `Overdue since ${formatShortDueDate(task.due_date, todayKey)}`,
            targetView: 'overdue',
          });
        }
      } else if (task.due_date === todayKey) {
        const id = `today_${task.id}`;
        if (!dismissedNotificationIds.includes(id)) {
          items.push({
            id,
            kind: 'today',
            title: task.title,
            detail: 'Due today',
            targetView: 'today',
          });
        }
      }
    }
    return items.slice(0, 8);
  }, [dismissedNotificationIds, preferences, tasks, todayKey]);

  const firstName = profile.display_name.split(' ')[0] || profile.display_name;
  const greeting = getTimeGreeting();
  const formattedDate = formatReadableDate();

  return (
    <header className="sticky top-0 z-20 border-b border-[#E5E0D8]/90 bg-[#FAF8F4]/95 backdrop-blur-xs dark:border-[#41464E]/90 dark:bg-[#20252C]/95">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Left: Mobile Trigger + Dynamic Greeting or Section Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="flex lg:hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E0D8] bg-white text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            {activeView === 'overview' ? (
              <>
                <h1 className="truncate text-lg sm:text-xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                  {greeting}, {firstName}
                </h1>
                <p className="truncate text-xs text-[#696E75] dark:text-[#A7A9AA] mt-0.5">
                  {formattedDate}
                </p>
              </>
            ) : (
              <>
                <h1 className="truncate text-lg sm:text-xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                  {VIEW_HEADERS[activeView].title}
                </h1>
                <p className="hidden sm:block truncate text-xs text-[#696E75] dark:text-[#A7A9AA] mt-0.5">
                  {VIEW_HEADERS[activeView].subtitle}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: Search + Notifications + Theme Toggle + Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          {/* Search Bar */}
          <div className="relative hidden md:block w-56 lg:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#696E75] dark:text-[#A7A9AA]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (e.target.value.trim() && activeView !== 'tasks') {
                  onNavigate('tasks');
                }
              }}
              placeholder="Search tasks..."
              aria-label="Search tasks"
              className="h-9 w-full rounded-lg border border-[#E5E0D8] bg-white pl-9 pr-8 text-xs text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:placeholder:text-[#8E9399] dark:focus:border-[#C69A76]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Mobile quick New Task button */}
          <button
            type="button"
            onClick={onNewTask}
            aria-label="New Task"
            className="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C18C64] text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Theme quick switch */}
          <button
            type="button"
            onClick={() => void setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            aria-label={
              effectiveTheme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
            title={
              effectiveTheme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E0D8] bg-white text-[#565D68] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
          >
            {effectiveTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={`Notifications (${notifications.length} unread)`}
              aria-expanded={notifOpen}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E0D8] bg-white text-[#565D68] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C18C64] px-1 font-mono text-[10px] font-semibold text-white dark:bg-[#C69A76] dark:text-[#20252C]">
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="region"
                aria-label="Task reminders"
                className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#E5E0D8] bg-white shadow-lg dark:border-[#41464E] dark:bg-[#2A3038]"
              >
                <div className="flex items-center justify-between border-b border-[#E5E0D8] px-4 py-3 dark:border-[#41464E]">
                  <span className="text-xs font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                    Reminders
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        clearAllNotifications(notifications.map((n) => n.id))
                      }
                      className="text-[11px] font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {preferences && !preferences.notifications_enabled ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#696E75] dark:text-[#A7A9AA]">
                      Notifications are paused in your preferences.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onNavigateSettings('notifications');
                      }}
                      className="mt-2 text-xs font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                    >
                      Manage notification settings
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs font-medium text-[#343B46] dark:text-[#F4F0E9]">
                      You’re all caught up
                    </p>
                    <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                      No overdue or pending reminders right now.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-72 divide-y divide-[#E5E0D8]/70 overflow-y-auto dark:divide-[#41464E]/70">
                    {notifications.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 px-4 py-3 hover:bg-[#FAF8F4] dark:hover:bg-[#343B46]/50"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            onNavigate(item.targetView);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-xs font-medium text-[#343B46] dark:text-[#F4F0E9]">
                            {item.title}
                          </p>
                          <p
                            className={`mt-0.5 text-[11px] ${
                              item.kind === 'overdue'
                                ? 'text-[#C96F68] dark:text-[#D8827B]'
                                : 'text-[#C18C64] dark:text-[#C69A76]'
                            }`}
                          >
                            {item.detail}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissNotification(item.id)}
                          aria-label={`Dismiss reminder for ${item.title}`}
                          className="rounded p-1 text-[#858A90] hover:bg-[#EDE5D9] hover:text-[#343B46] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Profile Avatar Shortcut */}
          <button
            type="button"
            onClick={() => onNavigateSettings('profile')}
            aria-label="Open My Profile"
            title={`${profile.display_name} — My Profile`}
            className="rounded-full transition-opacity hover:opacity-85 shrink-0"
          >
            <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
          </button>
        </div>
      </div>
    </header>
  );
}
