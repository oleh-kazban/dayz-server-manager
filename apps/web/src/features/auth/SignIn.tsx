import { SignInForm, SignInHero } from './components';

export function SignIn() {
  return (
    <div className="min-h-screen min-w-[320px] flex flex-col justify-between bg-[var(--color-canvas)] text-[var(--color-text-main)] select-none">
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:py-16 w-full">
        <div className="w-full min-w-[280px] max-w-[480px] sm:max-w-[520px] lg:max-w-[1120px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col lg:flex-row">
          <SignInHero />
          <SignInForm />
        </div>
      </main>
    </div>
  );
}
