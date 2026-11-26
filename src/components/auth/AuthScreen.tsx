import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { useApp } from '../../context/AppContext';
import { DEMO_ACCOUNTS_HINT } from '../../services/local/seedData';
import { EmailConfirmationRequiredError } from '../../services/supabase/supabaseServices';
import type { AuthView } from '../../types/models';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../../utils/validation';
import { Avatar } from '../ui/Avatar';
import { BrandMark } from '../ui/BrandMark';

interface AuthScreenProps {
  initialView?: AuthView;
  prefillEmail?: string;
}

export function AuthScreen({
  initialView = 'login',
  prefillEmail = '',
}: AuthScreenProps) {
  const {
    knownAccounts,
    signIn,
    signUp,
    requestPasswordReset,
    resetPassword,
    isCloudConfigured,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = useApp();

  const [view, setView] = useState<AuthView>(
    isPasswordRecovery ? 'reset-password' : initialView,
  );
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset & confirmation notice state
  const [resetCode, setResetCode] = useState('');
  const [generatedLocalCode, setGeneratedLocalCode] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery) {
      setView('reset-password');
    }
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail]);

  const switchView = (next: AuthView) => {
    setView(next);
    setError(null);
    setInfoNotice(null);
    setPassword('');
    setConfirmPassword('');
    if (next !== 'reset-password') {
      setResetNotice(null);
      clearPasswordRecovery();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validateDisplayName(displayName);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signUp({ display_name: displayName, email, password });
    } catch (err) {
      if (err instanceof EmailConfirmationRequiredError) {
        setInfoNotice(err.message);
        setEmail(err.email);
        setPassword('');
        setConfirmPassword('');
        setView('login');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to create account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(email);
      setGeneratedLocalCode(res.localResetToken || null);
      setResetCode(res.localResetToken || '');
      setResetNotice(res.message);
      setView('reset-password');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to request password reset.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordRecovery) {
      const emailErr = validateEmail(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }
      if (!resetCode.trim()) {
        setError('Enter the reset code.');
        return;
      }
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(email, resetCode, password);
      clearPasswordRecovery();
      setGeneratedLocalCode(null);
      setResetCode('');
      setPassword('');
      setConfirmPassword('');
      setInfoNotice('Password updated. Sign in with your new password.');
      setView('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F4] text-[#343B46] dark:bg-[#20252C] dark:text-[#F4F0E9]">
      {/* Left Editorial Column (Desktop) */}
      <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between overflow-hidden border-r border-[#E5E0D8] bg-[#EDE5D9] dark:border-[#41464E] dark:bg-[#1B2026]">
        <img
          src={BRAND.assets.authEditorialDesk}
          alt="Calm architectural travertine workspace with linen notebook and brass pen"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#20252C]/85 via-[#20252C]/35 to-[#20252C]/25"
        />

        <div className="relative z-10 p-10">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF8F4] text-[#343B46]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="12" rx="1.2" fill="currentColor" />
                <rect x="9" y="2" width="5" height="5" rx="1.2" fill="#C18C64" />
                <rect x="9" y="9" width="5" height="5" rx="1.2" fill="currentColor" fillOpacity="0.45" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-[0.14em] text-[#FAF8F4]">
              {BRAND.name}
            </span>
          </div>
        </div>

        <div className="relative z-10 p-10 max-w-md">
          <p className="text-2xl font-semibold leading-snug tracking-tight text-[#FAF8F4] text-balance">
            {BRAND.tagline}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#E5E0D8]/90">
            A calm, structured workspace for daily priorities, long-range planning, and quiet momentum.
          </p>
        </div>
      </div>

      {/* Right Form Column */}
      <main className="lg:col-span-7 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          {/* LOGIN */}
          {view === 'login' && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                Sign in to {BRAND.name}
              </h1>
              <p className="mt-1.5 text-sm text-[#696E75] dark:text-[#A7A9AA]">
                Enter your credentials to access your personal tasks and schedule.
              </p>

              {/* Previously used accounts (prefills email only, password still required) */}
              {knownAccounts.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-2">
                    Select an account on this device
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {knownAccounts.slice(0, 4).map((acct) => {
                      const active =
                        email.trim().toLowerCase() === acct.email.toLowerCase();
                      return (
                        <button
                          key={acct.id}
                          type="button"
                          aria-label={`Select ${acct.display_name} (${acct.email})`}
                          onClick={() => {
                            setEmail(acct.email);
                            setError(null);
                          }}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'border-[#C18C64] bg-white dark:border-[#C69A76] dark:bg-[#2A3038]'
                              : 'border-[#E5E0D8] bg-white/70 hover:bg-white dark:border-[#41464E] dark:bg-[#2A3038]/60 dark:hover:bg-[#2A3038]'
                          }`}
                        >
                          <Avatar
                            name={acct.display_name}
                            src={acct.avatar_url}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                              {acct.display_name}
                            </p>
                            <p className="truncate text-[11px] text-[#696E75] dark:text-[#A7A9AA]">
                              {acct.email}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                {infoNotice && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-[#648B72]/40 bg-[#648B72]/10 px-3.5 py-2.5 text-xs font-medium text-[#343B46] dark:text-[#F4F0E9]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#648B72] mt-0.5" />
                    <span>{infoNotice}</span>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-medium text-[#696E75] dark:text-[#A7A9AA]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot-password')}
                      className="text-xs font-medium text-[#C18C64] hover:underline dark:text-[#C69A76]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9] dark:focus:border-[#C69A76]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#C18C64] py-2.5 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[#696E75] dark:text-[#A7A9AA]">
                New to {BRAND.name}?{' '}
                <button
                  type="button"
                  onClick={() => switchView('signup')}
                  className="font-semibold text-[#343B46] hover:text-[#C18C64] dark:text-[#F4F0E9] dark:hover:text-[#C69A76]"
                >
                  Create an account
                </button>
              </p>

              {/* Transparent local mode demo credentials reference */}
              {!isCloudConfigured && (
                <div className="mt-8 rounded-xl border border-[#E5E0D8] bg-[#F2EDE5]/60 p-4 dark:border-[#41464E] dark:bg-[#2A3038]/70">
                  <p className="text-[11px] font-semibold text-[#343B46] dark:text-[#F4F0E9]">
                    Local preview accounts
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#696E75] dark:text-[#A7A9AA]">
                    Supabase is not connected yet; authentication runs against local browser storage. Sample credentials:
                  </p>
                  <ul className="mt-2 space-y-1 font-mono text-[11px] text-[#343B46] dark:text-[#D9DFE2]">
                    {DEMO_ACCOUNTS_HINT.map((d) => (
                      <li key={d.email} className="flex flex-wrap justify-between gap-2">
                        <span>{d.email}</span>
                        <span className="text-[#696E75] dark:text-[#A7A9AA]">
                          {d.passwordHint}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* SIGN UP */}
          {view === 'signup' && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                Create your workspace
              </h1>
              <p className="mt-1.5 text-sm text-[#696E75] dark:text-[#A7A9AA]">
                Set up a dedicated account with your own tasks, categories, and theme.
              </p>

              <form onSubmit={handleSignUpSubmit} className="mt-6 space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Display name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Alex Morgan"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="alex@studio.com"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="At least 8 characters with a number"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Confirm password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Re-enter your password"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#C18C64] py-2.5 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] dark:hover:bg-[#D2A885] transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[#696E75] dark:text-[#A7A9AA]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="font-semibold text-[#343B46] hover:text-[#C18C64] dark:text-[#F4F0E9] dark:hover:text-[#C69A76]"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {view === 'forgot-password' && (
            <div>
              <button
                type="button"
                onClick={() => switchView('login')}
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>

              <h1 className="text-2xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                Reset your password
              </h1>
              <p className="mt-1.5 text-sm text-[#696E75] dark:text-[#A7A9AA]">
                Enter the email associated with your account to generate a reset verification code.
              </p>

              <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] placeholder:text-[#858A90] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#C18C64] py-2.5 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] transition-colors disabled:opacity-60"
                >
                  {isSubmitting
                    ? isCloudConfigured
                      ? 'Sending reset email...'
                      : 'Generating code...'
                    : isCloudConfigured
                      ? 'Send reset email'
                      : 'Continue to reset'}
                </button>
              </form>
            </div>
          )}

          {/* PASSWORD RESET */}
          {view === 'reset-password' && (
            <div>
              <button
                type="button"
                onClick={() => switchView('login')}
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#696E75] hover:text-[#343B46] dark:text-[#A7A9AA] dark:hover:text-[#F4F0E9]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>

              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-[#C18C64] dark:text-[#C69A76]" />
                <h1 className="text-2xl font-semibold tracking-tight text-[#343B46] dark:text-[#F4F0E9]">
                  Set a new password
                </h1>
              </div>

              {resetNotice && (
                <div className="mt-4 rounded-xl border border-[#648B72]/35 bg-[#648B72]/10 p-3.5 text-xs text-[#343B46] dark:text-[#F4F0E9]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#648B72] mt-0.5" />
                    <div>
                      <p className="leading-relaxed">{resetNotice}</p>
                      {generatedLocalCode && (
                        <p className="mt-2 font-mono text-sm font-semibold tracking-widest text-[#343B46] dark:text-[#F4F0E9]">
                          Code: {generatedLocalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="mt-5 space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#C96F68]/40 bg-[#C96F68]/10 px-3.5 py-2.5 text-xs font-medium text-[#A94E48] dark:text-[#E59D97]"
                  >
                    {error}
                  </div>
                )}

                {!isPasswordRecovery && (
                  <div>
                    <label
                      htmlFor="reset-code"
                      className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                    >
                      Verification code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="6-character code"
                      className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters with a number"
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-medium text-[#696E75] dark:text-[#A7A9AA] mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E0D8] bg-white px-3.5 py-2.5 text-sm text-[#343B46] focus:border-[#C18C64] focus:outline-none dark:border-[#41464E] dark:bg-[#2A3038] dark:text-[#F4F0E9]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#C18C64] py-2.5 text-sm font-medium text-white hover:bg-[#AE7B54] dark:bg-[#C69A76] dark:text-[#20252C] transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Updating password...' : 'Save new password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
