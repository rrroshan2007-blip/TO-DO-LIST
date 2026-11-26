import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Database,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { SettingsTab, ThemeMode } from '../../types/models';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../../utils/validation';
import { Avatar } from '../ui/Avatar';

interface SettingsViewProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onSwitchAccount: (prefillEmail?: string) => void;
  onRequestSignOut: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'security', label: 'Account & Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account Management', icon: Users },
];

export function SettingsView({
  activeTab,
  onTabChange,
  onSwitchAccount,
  onRequestSignOut,
}: SettingsViewProps) {
  const {
    profile,
    session,
    preferences,
    knownAccounts,
    serviceMode,
    isCloudConfigured,
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
    updatePreferences,
    setTheme,
    addToast,
  } = useApp();

  // Profile form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account modal/inline confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setEmail(profile.email);
    }
  }, [profile]);

  if (!profile || !preferences) return null;

  const createdDateFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(profile.created_at));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setProfileError(nameErr);
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setProfileError(emailErr);
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
      });
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Unable to save profile changes.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Unsupported file',
        description: 'Please choose a JPG, PNG, or WebP image.',
      });
      return;
    }
    try {
      await uploadAvatar(file);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not update photo.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setPasswordError(pwErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Choose a new password different from your current password.');
      return;
    }

    setPasswordError(null);
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Unable to update password.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmPhrase.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm account removal.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete account.',
      );
      setIsDeletingAccount(false);
    }
  };

  const themeOptions: {
    id: ThemeMode;
    label: string;
    description: string;
    icon: typeof Sun;
    previewBg: string;
    previewCard: string;
    previewBorder: string;
  }[] = [
    {
      id: 'light',
      label: 'Light',
      description: 'Warm sand canvas with crisp white cards.',
      icon: Sun,
      previewBg: '#FAF8F4',
      previewCard: '#FFFFFF',
      previewBorder: '#E5E0D8',
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Deep graphite surfaces with muted copper accents.',
      icon: Moon,
      previewBg: '#20252C',
      previewCard: '#2A3038',
      previewBorder: '#41464E',
    },
    {
      id: 'system',
      label: 'System',
      description: 'Automatically follows your operating system preference.',
      icon: Monitor,
      previewBg: 'linear-gradient(135deg, #FAF8F4 50%, #20252C 50%)',
      previewCard: '#C18C64',
      previewBorder: '#858A90',
    },
  ];

  const otherAccounts = knownAccounts.filter((a) => a.id !== profile.id);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Settings Navigation Rail */}
      <nav
        aria-label="Settings sections"
        className="lg:col-span-3 flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#EDE5D9] font-semibold text-[#343B46] dark:bg-[#2A3038] dark:text-[#F4F0E9]'
                  : 'font-medium text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#2A3038]/60 dark:hover:text-[#F4F0E9]'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  active
                    ? 'text-[#C18C64] dark:text-[#C69A76]'
                    : 'text-[#696E75] dark:text-[#8E9399]'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Settings Panel */}
      <div className="lg:col-span-9 space-y-6">
        {/* MY PROFILE */}
        {activeTab === 'profile' && (
          <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
            <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
              My Profile
            </h2>
            <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
              Personalize how your name, email, and portrait appear across your workspace.
            </p>

            {/* Avatar Upload Row */}
            <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-[#E5E0D8] pb-6 dark:border-[#41464E]">
              <Avatar
                name={profile.display_name}
                src={profile.avatar_url}
                size="xl"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void handleAvatarUpload(e)}
                    className="sr-only"
                    aria-label="Upload profile picture"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-3.5 py-2 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Change photo
                  </button>
                  {profile.avatar_url && (
                    <button
                      type="button"
                      onClick={() => void updateProfile({ avatar_url: null })}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[#696E75] hover:bg-[#F2EDE5] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:bg-[#343B46] dark:hover:text-[#F4F0E9]"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#696E75] dark:text-[#A7A9AA]">
                  JPG, PNG, or WebP up to 2 MB.
                </p>
              </div>
            </div>

            {/* Display Name & Email Form */}
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-5 max-w-lg">
              {profileError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                >
                  {profileError}
                </div>
              )}

              <div>
                <label
                  htmlFor="profile-display-name"
                  className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                >
                  Display name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (profileError) setProfileError(null);
                  }}
                  className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileError) setProfileError(null);
                  }}
                  className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                />
              </div>

              <div className="rounded-lg border border-[#E5E0D8]/80 bg-[#FAF8F4]/60 px-4 py-3 text-xs text-[#696E75] dark:border-[#41464E]/80 dark:bg-[#20252C]/50 dark:text-[#A7A9AA]">
                Member since{' '}
                <span className="font-mono font-medium text-[#343B46] dark:text-[#F4F0E9]">
                  {createdDateFormatted}
                </span>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-[#C18C64] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ACCOUNT & SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
              <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                Change password
              </h2>
              <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                Use at least 8 characters with a combination of letters and numbers.
              </p>

              <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-md">
                {passwordError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                  >
                    {passwordError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-new-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/50 px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:bg-white focus:outline-none dark:border-[#41464E] dark:bg-[#20252C]/70 dark:text-[#F4F0E9]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-lg bg-[#343B46] px-4 py-2.5 text-sm font-medium text-[#FAF8F4] hover:bg-[#252A33] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors disabled:opacity-60"
                >
                  {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </section>

            {/* Active Session */}
            <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
              <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                Current session
              </h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E5E0D8]/80 bg-[#FAF8F4]/60 px-4 py-3.5 dark:border-[#41464E]/80 dark:bg-[#20252C]/60">
                <div>
                  <p className="text-sm font-medium text-[#343B46] dark:text-[#F4F0E9]">
                    Browser session ({serviceMode === 'local' ? 'Local storage' : 'Supabase Auth'})
                  </p>
                  <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                    Signed in as {profile.email}
                    {session?.signed_in_at
                      ? ` · ${new Date(session.signed_in_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestSignOut}
                  className="rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2 text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                >
                  Sign out
                </button>
              </div>
            </section>

            {/* Danger Zone: Delete Account */}
            <section className="rounded-xl border border-[#C96F68]/40 bg-white p-6 dark:border-[#D8827B]/35 dark:bg-[#2A3038]">
              <h2 className="text-base font-semibold text-[#B35852] dark:text-[#E0928B]">
                Delete account
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                Permanently removes your profile, tasks, subtasks, categories, and saved preferences from this workspace. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#C96F68]/50 px-4 py-2 text-xs font-semibold text-[#B35852] hover:bg-[#C96F68]/10 dark:text-[#E0928B]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete my account
                </button>
              ) : (
                <form
                  onSubmit={handleDeleteAccount}
                  className="mt-4 space-y-3.5 rounded-lg border border-[#C96F68]/30 bg-[#C96F68]/[0.04] p-4 max-w-md"
                >
                  {deleteError && (
                    <p role="alert" className="text-xs font-medium text-[#B35852] dark:text-[#E0928B]">
                      {deleteError}
                    </p>
                  )}
                  <div>
                    <label
                      htmlFor="delete-confirm-phrase"
                      className="block text-xs font-medium text-[#343B46] dark:text-[#F4F0E9] mb-1"
                    >
                      Type DELETE to confirm
                    </label>
                    <input
                      id="delete-confirm-phrase"
                      type="text"
                      value={deleteConfirmPhrase}
                      onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                      placeholder="DELETE"
                      className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#343B46] focus:border-[#C96F68] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="delete-confirm-password"
                      className="block text-xs font-medium text-[#343B46] dark:text-[#F4F0E9] mb-1"
                    >
                      Confirm your password
                    </label>
                    <input
                      id="delete-confirm-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#343B46] focus:border-[#C96F68] focus:outline-none dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isDeletingAccount}
                      className="rounded-lg bg-[#C96F68] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B85E57] disabled:opacity-60"
                    >
                      {isDeletingAccount ? 'Deleting...' : 'Permanently delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setDeleteConfirmPhrase('');
                        setDeleteError(null);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}

        {/* APPEARANCE */}
        {activeTab === 'appearance' && (
          <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
            <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
              Appearance
            </h2>
            <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
              Choose how DAYFORM renders on this device. Your preference is saved to your profile.
            </p>

            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const selected = preferences.theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      void setTheme(option.id);
                      addToast({
                        type: 'info',
                        title: `Theme set to ${option.label}`,
                      });
                    }}
                    className={`flex flex-col rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#C18C64] bg-[#FAF8F4] dark:border-[#C69A76] dark:bg-[#20252C]'
                        : 'border-[#E5E0D8] bg-white hover:border-[#D6CEC2] dark:border-[#41464E] dark:bg-[#2A3038] dark:hover:border-[#525862]'
                    }`}
                  >
                    {/* Visual Mini Swatch */}
                    <div
                      className="mb-3.5 h-16 w-full rounded-lg border p-2.5 flex items-end justify-between"
                      style={{
                        background: option.previewBg,
                        borderColor: option.previewBorder,
                      }}
                    >
                      <div
                        className="h-6 w-14 rounded border"
                        style={{
                          backgroundColor: option.previewCard,
                          borderColor: option.previewBorder,
                        }}
                      />
                      <div className="h-3 w-6 rounded-sm bg-[#C18C64]" />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {option.label}
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 text-[#C18C64] dark:text-[#C69A76]" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
            <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
              Notifications & Planning
            </h2>
            <p className="mt-1 text-xs text-[#696E75] dark:text-[#A7A9AA]">
              Control reminder alerts and calendar layout defaults.
            </p>

            <div className="mt-6 divide-y divide-[#E5E0D8] dark:divide-[#41464E]">
              {[
                {
                  key: 'notifications_enabled' as const,
                  title: 'In-app reminders',
                  desc: 'Show overdue and due-today reminders in your top bar bell.',
                  checked: preferences.notifications_enabled,
                },
                {
                  key: 'due_date_reminders' as const,
                  title: 'Due date alerts',
                  desc: 'Highlight tasks approaching their deadline on your dashboard.',
                  checked: preferences.due_date_reminders,
                },
                {
                  key: 'daily_digest' as const,
                  title: 'Morning summary',
                  desc: 'Prepare a morning overview of today’s priorities (syncs with Supabase email when connected).',
                  checked: preferences.daily_digest,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#343B46] dark:text-[#F4F0E9]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                      {item.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.checked}
                    aria-label={item.title}
                    onClick={() => {
                      void updatePreferences({ [item.key]: !item.checked });
                      addToast({
                        type: 'info',
                        title: `${item.title} ${!item.checked ? 'enabled' : 'disabled'}`,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      item.checked
                        ? 'bg-[#C18C64] dark:bg-[#C69A76]'
                        : 'bg-[#D9DFE2] dark:bg-[#41464E]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.checked ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}

              {/* Week Starts On */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                <div>
                  <p className="text-sm font-medium text-[#343B46] dark:text-[#F4F0E9]">
                    Calendar week starts on
                  </p>
                  <p className="mt-0.5 text-xs text-[#696E75] dark:text-[#A7A9AA]">
                    Adjusts the first column in your monthly calendar view.
                  </p>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Week start day"
                  className="inline-flex rounded-lg bg-[#F2EDE5] p-1 dark:bg-[#20252C]"
                >
                  {(['monday', 'sunday'] as const).map((day) => (
                    <button
                      key={day}
                      type="button"
                      role="radio"
                      aria-checked={preferences.week_starts_on === day}
                      onClick={() => {
                        void updatePreferences({ week_starts_on: day });
                        addToast({
                          type: 'info',
                          title: `Calendar starts on ${day === 'monday' ? 'Monday' : 'Sunday'}`,
                        });
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        preferences.week_starts_on === day
                          ? 'bg-white text-[#343B46] shadow-xs dark:bg-[#343B46] dark:text-[#F4F0E9]'
                          : 'text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ACCOUNT MANAGEMENT */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
              <h2 className="text-base font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                Switch account
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                Switching accounts ends your current session and opens the sign-in screen so you can authenticate securely with another account.
              </p>

              {otherAccounts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-[#696E75] dark:text-[#A7A9AA]">
                    Previously used on this device
                  </p>
                  {otherAccounts.map((acct) => (
                    <div
                      key={acct.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4]/60 px-3.5 py-2.5 dark:border-[#41464E] dark:bg-[#20252C]/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={acct.display_name}
                          src={acct.avatar_url}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#343B46] dark:text-[#F4F0E9]">
                            {acct.display_name}
                          </p>
                          <p className="truncate text-xs text-[#696E75] dark:text-[#A7A9AA]">
                            {acct.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSwitchAccount(acct.email)}
                        className="rounded-lg border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#343B46] hover:bg-[#F2EDE5] dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:hover:bg-[#343B46] whitespace-nowrap shrink-0"
                      >
                        Sign in as {acct.display_name.split(' ')[0]}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSwitchAccount()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-[#FAF8F4] px-4 py-2 text-xs font-medium text-[#343B46] hover:bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#20252C] dark:text-[#F4F0E9] dark:hover:bg-[#343B46]"
                >
                  <Users className="h-3.5 w-3.5" />
                  Sign into another account
                </button>
                <button
                  type="button"
                  onClick={onRequestSignOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#C96F68]/45 px-4 py-2 text-xs font-medium text-[#B35852] hover:bg-[#C96F68]/10 dark:text-[#E0928B]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </section>

            {/* Transparent Storage & Supabase Readiness */}
            <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 dark:border-[#41464E] dark:bg-[#2A3038]">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2EDE5] text-[#C18C64] dark:bg-[#343B46] dark:text-[#C69A76]">
                  <Database className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                    Data persistence & Supabase readiness
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                    {isCloudConfigured
                      ? 'Connected to Supabase. Authentication, tasks, categories, subtasks, profile avatars, and preferences sync securely with your Supabase project under Row Level Security.'
                      : 'Currently running in local browser persistence mode. Accounts, tasks, categories, subtasks, and preferences are stored locally on this device and are not synced to the cloud until you connect a Supabase project via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
