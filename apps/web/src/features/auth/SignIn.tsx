import { ArrowRight, Eye, Lock, Server, ShieldCheck, UserRound } from 'lucide-react';

import { FlavorText } from '../flavor-text';

export function SignIn() {
  return (
    <div className="min-h-screen min-w-[320px] flex flex-col justify-between bg-[var(--color-canvas)] text-[var(--color-text-main)] select-none">
      {/* ----------------------------------------------------------------
          TOP HEADER BAR
          ---------------------------------------------------------------- */}
      {/* <header className="h-[76px] px-6 lg:px-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <div className="flex items-center gap-2.5">
          <Logo className="w-[30px] h-[31px] shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-[18px] tracking-tight text-[var(--color-text-main)]">
              OUTLIVE
            </span>
            <span className="text-[8px] font-semibold tracking-[0.25em] text-[var(--color-text-muted)] mt-0.5">
              PROJECT
            </span>
          </div>
        </div>

        <a
          href="#support"
          className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] transition-colors"
        >
          <HelpCircle className="w-[17px] h-[17px] text-[var(--color-text-muted)]" />
          <span>Contact support ↗</span>
        </a>
      </header> */}

      {/* ----------------------------------------------------------------
          MAIN CONTENT: SIGN IN CARD & STATUS INDICATOR
          ---------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:py-16 w-full">
        <div className="w-full min-w-[280px] max-w-[480px] sm:max-w-[520px] lg:max-w-[1120px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Brand & World Banner */}
          <div className="w-full lg:w-[480px] xl:w-[520px] lg:min-h-[650px] relative p-5 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden shrink-0 bg-[#102a40]">
            {/* Chernarus Panorama & Scrim */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none"
              style={{ backgroundImage: "url('/assets/images/dark-misty-chernarus-bg.png')" }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(16, 42, 64, 0.31) 0%, rgba(29, 57, 76, 0.5) 40%, rgba(16, 42, 64, 0.95) 100%)',
              }}
            />

            {/* Top Workspace Badge */}
            <div className="relative z-10 flex items-center gap-2 text-[#CCDAE5]">
              <Server className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-medium tracking-widest uppercase">
                YOUR SERVER. YOUR WORLD.
              </span>
            </div>

            {/* Bottom Welcome Message & Security Pillar */}
            <div className="relative z-10 space-y-6 mt-8 sm:mt-12 lg:mt-0">
              <div className="space-y-3">
                <FlavorText variant="hero" />
                <p className="text-xs sm:text-[13px] text-[#CCDAE5] leading-[1.7] max-w-sm">
                  Keep your community connected. Manage your servers, players, and everything in
                  between.
                </p>
              </div>

              <div className="pt-6 border-t border-white/15 flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-white block leading-tight">
                    A secure home for your community
                  </span>
                  <span className="text-[10px] text-[#CCDAE5] block leading-tight">
                    Access managed by your workspace administrator
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Credentials Form */}
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
                {/* Username / Email Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="block text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Username or email
                  </label>
                  <div className="flex items-center gap-3 h-12 px-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] focus-within:border-[var(--color-primary)] transition-colors">
                    <UserRound className="w-[17px] h-[17px] text-[var(--color-text-muted)] shrink-0" />
                    <input
                      id="username"
                      type="text"
                      defaultValue=""
                      placeholder="Enter your username or email"
                      className="w-full bg-transparent text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-[var(--color-text-main)]"
                  >
                    Password
                  </label>
                  <div className="flex items-center gap-3 h-12 px-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] focus-within:border-[var(--color-primary)] transition-colors">
                    <Lock className="w-[17px] h-[17px] text-[var(--color-text-muted)] shrink-0" />
                    <input
                      id="password"
                      type="password"
                      defaultValue=""
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                    >
                      <Eye className="w-[17px] h-[17px]" />
                    </button>
                  </div>
                </div>

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
        </div>

        {/* Global Operational Status */}
        {/* <div className="flex items-center gap-2 mt-7 text-[11px] text-[var(--color-text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          <span>All systems operational</span>
        </div> */}
      </main>

      {/* ----------------------------------------------------------------
          BOTTOM FOOTER BAR
          ---------------------------------------------------------------- */}
      {/* <footer className="h-[76px] px-6 lg:px-10 flex items-center justify-between text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border-subtle)] shrink-0">
        <span>© 2026 Outlive Project</span>
        <span className="font-mono text-[10px] tracking-wider uppercase">
          GAME SERVER MANAGEMENT
        </span>
      </footer> */}
    </div>
  );
}
