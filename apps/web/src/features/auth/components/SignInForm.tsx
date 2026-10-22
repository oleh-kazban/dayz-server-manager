import { ArrowRight, UserRound } from 'lucide-react';

import { Input, PasswordInput } from '@dsm/components/ui';

export function SignInForm() {
  return (
    <div className="flex-1 p-5 sm:p-8 lg:p-10 xl:p-[66px_72px_48px] flex flex-col justify-between bg-[var(--color-surface)]">
      <div className="space-y-8">
        {/* Heading */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
            WORKSPACE ACCESS
          </span>
          <h2 className="text-2xl sm:text-[28px] font-normal text-[var(--color-text-main)] tracking-tight">
            Welcome back
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-[1.6]">
            Sign in with your credentials to manage your servers.
          </p>
        </div>

        {/* Form Controls */}
        <form onSubmit={e => e.preventDefault()} className="space-y-5">
          <Input
            label="Username or email"
            id="username"
            leftIcon={UserRound}
            type="text"
            placeholder="Enter your username or email"
            autoComplete="username"
          />

          <PasswordInput
            label="Password"
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          {/* Remember Me */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              id="remember"
              type="checkbox"
              className="w-[15px] h-[15px] rounded border border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-[11px] text-[var(--color-text-secondary)] cursor-pointer"
            >
              Remember me on this device
            </label>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full h-[46px] rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer mt-2"
          >
            <span>Sign in</span>
            <ArrowRight className="w-[15px] h-[15px]" />
          </button>
        </form>
      </div>

      {/* Assistance Footer */}
      <div className="pt-6 border-t border-[var(--color-border-subtle)] space-y-1 mt-8">
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
          Trouble signing in?
        </span>
        <p className="text-[11px] text-[var(--color-text-muted)] leading-[1.65]">
          Contact your workspace administrator for your credentials or to reset your password.
        </p>
      </div>
    </div>
  );
}
