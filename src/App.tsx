import { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { TaskModal } from './components/tasks/TaskModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { ToastStack } from './components/ui/ToastStack';
import { CalendarView } from './components/views/CalendarView';
import { CategoriesView } from './components/views/CategoriesView';
import { OverviewView } from './components/views/OverviewView';
import { SettingsView } from './components/views/SettingsView';
import { TaskListView } from './components/views/TaskListView';
import { AppProvider, useApp } from './context/AppContext';
import type { NavView, SettingsTab, Task } from './types/models';
import {
  getTodayKey,
  isTaskOverdue,
  isTaskUpcoming,
} from './utils/taskLogic';

function DayformShell() {
  const {
    isLoading,
    isWorkspaceLoading,
    isPasswordRecovery,
    session,
    profile,
    tasks,
    signOut,
    deleteTask,
  } = useApp();

  const [activeView, setActiveView] = useState<NavView>('overview');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Task Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDefaultDueDate, setModalDefaultDueDate] = useState<string | null | undefined>(
    undefined,
  );
  const [modalDefaultCategoryId, setModalDefaultCategoryId] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [switchPrefillEmail, setSwitchPrefillEmail] = useState<string>('');

  // Reset workspace navigation & transient search when switching accounts
  useEffect(() => {
    setActiveView('overview');
    setSettingsTab('profile');
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setTaskModalOpen(false);
    setMobileNavOpen(false);
  }, [session?.user_id]);

  const todayKey = getTodayKey();

  const sidebarCounts = useMemo(() => {
    let todayPending = 0;
    let upcoming = 0;
    let overdue = 0;
    let allPending = 0;

    for (const task of tasks) {
      if (!task.is_completed) {
        allPending += 1;
        if (task.due_date === todayKey) todayPending += 1;
        if (isTaskUpcoming(task, todayKey)) upcoming += 1;
        if (isTaskOverdue(task, todayKey)) overdue += 1;
      }
    }

    return { todayPending, upcoming, overdue, allPending };
  }, [tasks, todayKey]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] dark:bg-[#20252C]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-[#C18C64]/70" />
          <p className="text-xs font-medium tracking-wider text-[#696E75] dark:text-[#A7A9AA]">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery || !session || !profile) {
    return (
      <>
        <AuthScreen
          initialView={isPasswordRecovery ? 'reset-password' : 'login'}
          prefillEmail={switchPrefillEmail}
        />
        <ToastStack />
      </>
    );
  }

  const openNewTaskModal = (
    defaultDueDate?: string | null,
    defaultCategoryId?: string | null,
  ) => {
    setEditingTask(null);
    setModalDefaultDueDate(defaultDueDate);
    setModalDefaultCategoryId(defaultCategoryId || null);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setModalDefaultDueDate(undefined);
    setModalDefaultCategoryId(null);
    setTaskModalOpen(true);
  };

  const handleNavigate = (view: NavView) => {
    setActiveView(view);
    if (view !== 'tasks') {
      setSelectedCategoryFilter('all');
    }
  };

  const handleNavigateSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setActiveView('settings');
  };

  const handleSwitchAccount = async (prefillEmail?: string) => {
    setSwitchPrefillEmail(prefillEmail || '');
    await signOut();
  };

  const handleConfirmSignOut = async () => {
    setConfirmSignOutOpen(false);
    setSwitchPrefillEmail('');
    await signOut();
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8F4] text-[#343B46] dark:bg-[#20252C] dark:text-[#F4F0E9]">
      <Sidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        profile={profile}
        counts={sidebarCounts}
        onNavigate={handleNavigate}
        onNavigateSettings={handleNavigateSettings}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setMobileNavOpen(false)}
        onNewTask={() => openNewTaskModal(todayKey)}
        onSwitchAccount={() => void handleSwitchAccount()}
        onRequestSignOut={() => setConfirmSignOutOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          activeView={activeView}
          profile={profile}
          tasks={tasks}
          todayKey={todayKey}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onNewTask={() => openNewTaskModal(todayKey)}
          onNavigate={handleNavigate}
          onNavigateSettings={handleNavigateSettings}
        />

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {isWorkspaceLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="h-28 animate-pulse rounded-xl border border-[#E5E0D8] bg-white dark:border-[#41464E] dark:bg-[#2A3038]"
                  />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-xl border border-[#E5E0D8] bg-white dark:border-[#41464E] dark:bg-[#2A3038]" />
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <OverviewView
                  todayKey={todayKey}
                  onNavigate={handleNavigate}
                  onOpenNewTask={(due) => openNewTaskModal(due)}
                  onEditTask={openEditTaskModal}
                  onDeleteTask={setTaskToDelete}
                />
              )}

              {(activeView === 'tasks' ||
                activeView === 'today' ||
                activeView === 'upcoming' ||
                activeView === 'completed' ||
                activeView === 'overdue') && (
                <TaskListView
                  mode={activeView}
                  todayKey={todayKey}
                  globalSearch={searchQuery}
                  initialCategoryFilter={selectedCategoryFilter}
                  onGlobalSearchChange={setSearchQuery}
                  onClearCategoryFilter={() => setSelectedCategoryFilter('all')}
                  onOpenNewTask={(due, catId) => openNewTaskModal(due, catId)}
                  onEditTask={openEditTaskModal}
                  onDeleteTask={setTaskToDelete}
                />
              )}

              {activeView === 'calendar' && (
                <CalendarView
                  todayKey={todayKey}
                  onCreateTaskForDate={(dateKey) => openNewTaskModal(dateKey)}
                  onEditTask={openEditTaskModal}
                />
              )}

              {activeView === 'categories' && (
                <CategoriesView
                  onOpenCategoryTasks={(categoryId) => {
                    setSelectedCategoryFilter(categoryId);
                    setActiveView('tasks');
                  }}
                  onCreateTaskInCategory={(categoryId) =>
                    openNewTaskModal(todayKey, categoryId)
                  }
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  activeTab={settingsTab}
                  onTabChange={setSettingsTab}
                  onSwitchAccount={(email) => void handleSwitchAccount(email)}
                  onRequestSignOut={() => setConfirmSignOutOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        open={taskModalOpen}
        editingTask={editingTask}
        defaultDueDate={modalDefaultDueDate}
        defaultCategoryId={modalDefaultCategoryId}
        onClose={() => setTaskModalOpen(false)}
      />

      {/* Sign Out Confirmation Dialog */}
      <ConfirmDialog
        open={confirmSignOutOpen}
        title="Sign out of DAYFORM?"
        description="Your tasks remain saved on this device. You will need your email and password to sign back in."
        confirmLabel="Sign out"
        onCancel={() => setConfirmSignOutOpen(false)}
        onConfirm={() => void handleConfirmSignOut()}
      />

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        title="Delete this task?"
        description={
          taskToDelete
            ? `"${taskToDelete.title}" and its subtasks will be permanently removed.`
            : ''
        }
        confirmLabel="Delete task"
        tone="danger"
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            void deleteTask(taskToDelete.id);
          }
          setTaskToDelete(null);
        }}
      />

      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DayformShell />
    </AppProvider>
  );
}
