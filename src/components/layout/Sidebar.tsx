import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import type { NavView, Profile, SettingsTab } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';

interface SidebarProps {
  activeView: NavView;
  collapsed: boolean;
  mobileOpen: boolean;
  profile: Profile;
  counts: {
    todayPending: number;
    upcoming: number;
    overdue: number;
    allPending: number;
  };
  onNavigate: (view: NavView) => void;
  onNavigateSettings: (tab: SettingsTab) => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNewTask: () => void;
  onSwitchAccount: () => void;
  onRequestSignOut: () => void;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  icon: typeof LayoutDashboard;
  countKey?: keyof SidebarProps['counts'];
  accentDanger?: boolean;
}

const PRIMARY_NAV: NavItemConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: ListTodo, countKey: 'allPending' },
  { id: 'today', label: 'Today', icon: Sun, countKey: 'todayPending' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, countKey: 'upcoming' },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'overdue', label: 'Overdue', icon: AlertCircle, countKey: 'overdue', accentDanger: true },
];

const SECONDARY_NAV: NavItemConfig[] = [
  { id: 'categories', label: 'Categories', icon: FolderKanban },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeView,
  collapsed,
  mobileOpen,
  profile,
  counts,
  onNavigate,
  onNavigateSettings,
  onToggleCollapse,
  onCloseMobile,
  onNewTask,
  onSwitchAccount,
  onRequestSignOut,
}: SidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileMenuOpen]);

  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    onCloseMobile();
  };

  const renderSidebarBody = (isCompact: boolean) => (
    <div className="flex h-full flex-col bg-[#F2EDE5]/85 border-r border-[#E5E0D8] dark:bg-[#1B2026] dark:border-[#41464E]">
      {/* Top Brand Row */}
      <div
        className={`flex items-center ${
          isCompact ? 'justify-center px-2' : 'justify-between px-4'
        } h-16 border-b border-[#E5E0D8]/80 dark:border-[#41464E]/80 shrink-0`}
      >
        <BrandMark compact={isCompact} showTagline={!isCompact} />

        {/* Desktop collapse button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[#696E75] hover:bg-[#EDE5D9] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors ${
            isCompact ? 'hidden' : ''
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-[#696E75] hover:bg-[#EDE5D9] dark:text-[#A7A9AA] dark:hover:bg-[#343B46]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed on desktop */}
      {isCompact && (
        <div className="hidden lg:flex justify-center pt-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#696E75] hover:bg-[#EDE5D9] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Prominent New Task Button */}
      <div className={`${isCompact ? 'px-2.5' : 'px-4'} pt-4 pb-2 shrink-0`}>
        <button
          type="button"
          onClick={() => {
            onNewTask();
            onCloseMobile();
          }}
          aria-label="New Task"
          title={isCompact ? 'New Task' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-[#C18C64] text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors whitespace-nowrap ${
            isCompact ? 'h-10 px-0' : 'h-10 px-4'
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!isCompact && <span>New Task</span>}
        </button>
      </div>

      {/* Main Navigation */}
      <nav
        aria-label="Workspace navigation"
        className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5"
      >
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            const count = item.countKey ? counts[item.countKey] : 0;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={isCompact ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center ${
                    isCompact ? 'justify-center px-0' : 'justify-between px-3'
                  } h-9 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-[#EDE5D9] font-semibold text-[#343B46] dark:bg-[#2A3038] dark:text-[#F4F0E9]'
                      : 'font-medium text-[#565D68] hover:bg-[#EDE5D9]/60 hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#2A3038]/60 dark:hover:text-[#F4F0E9]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active
                          ? 'text-[#C18C64] dark:text-[#C69A76]'
                          : item.accentDanger && count > 0
                            ? 'text-[#C96F68] dark:text-[#D8827B]'
                            : 'text-[#696E75] dark:text-[#8E9399]'
                      }`}
                    />
                    {!isCompact && <span className="truncate">{item.label}</span>}
                  </span>

                  {!isCompact && count > 0 && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        item.accentDanger
                          ? 'font-medium text-[#C96F68] dark:text-[#D8827B]'
                          : 'text-[#696E75] dark:text-[#A7A9AA]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-[#E5E0D8]/90 pt-4 dark:border-[#41464E]/80">
          <ul className="space-y-0.5">
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={isCompact ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center ${
                      isCompact ? 'justify-center px-0' : 'gap-2.5 px-3'
                    } h-9 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-[#EDE5D9] font-semibold text-[#343B46] dark:bg-[#2A3038] dark:text-[#F4F0E9]'
                        : 'font-medium text-[#565D68] hover:bg-[#EDE5D9]/60 hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#2A3038]/60 dark:hover:text-[#F4F0E9]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active
                          ? 'text-[#C18C64] dark:text-[#C69A76]'
                          : 'text-[#696E75] dark:text-[#8E9399]'
                      }`}
                    />
                    {!isCompact && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom Profile Section with Upward Dropdown */}
      <div
        ref={profileMenuRef}
        className="relative border-t border-[#E5E0D8]/90 p-2.5 dark:border-[#41464E]/80 shrink-0"
      >
        {profileMenuOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            className={`absolute bottom-16 z-40 w-56 rounded-xl border border-[#E5E0D8] bg-white py-1.5 shadow-lg dark:border-[#41464E] dark:bg-[#2A3038] ${
              isCompact ? 'left-2' : 'left-2.5 right-2.5 w-auto'
            }`}
          >
            <div className="border-b border-[#E5E0D8] px-3.5 py-2 dark:border-[#41464E]">
              <p className="truncate text-xs font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                {profile.display_name}
              </p>
              <p className="truncate text-[11px] text-[#696E75] dark:text-[#A7A9AA]">
                {profile.email}
              </p>
            </div>

            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigateSettings('profile');
                  onCloseMobile();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                <User className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                My Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onNavigateSettings('security');
                  onCloseMobile();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                <Settings className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                Account Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSwitchAccount();
                  onCloseMobile();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
              >
                <Users className="h-3.5 w-3.5 text-[#696E75] dark:text-[#A7A9AA]" />
                Switch Account
              </button>
            </div>

            <div className="border-t border-[#E5E0D8] pt-1 dark:border-[#41464E]">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onRequestSignOut();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-[#C96F68] hover:bg-[#C96F68]/10 dark:text-[#D8827B]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen}
          aria-label={`Account menu for ${profile.display_name}`}
          className={`flex w-full items-center ${
            isCompact ? 'justify-center p-1.5' : 'gap-3 px-2 py-2'
          } rounded-lg hover:bg-[#EDE5D9]/80 dark:hover:bg-[#2A3038] transition-colors text-left`}
        >
          <Avatar name={profile.display_name} src={profile.avatar_url} size="md" />
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9] leading-tight">
                {profile.display_name}
              </p>
              <p className="truncate text-xs text-[#696E75] dark:text-[#A7A9AA] mt-0.5">
                {profile.email}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[272px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarBody(collapsed)}</div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-[#20252C]/45 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[272px] max-w-[85vw] h-full">
            {renderSidebarBody(false)}
          </div>
        </div>
      )}
    </>
  );
}
