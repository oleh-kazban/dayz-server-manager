import { Server, ShieldCheck } from 'lucide-react';

import { FlavorText } from '../../flavor-text';

export function SignInHero() {
  return (
    <div className="w-full lg:w-[480px] xl:w-[520px] lg:min-h-[520px] relative p-5 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden shrink-0 bg-[var(--color-surface-subtle)]">
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
      <div className="relative z-10 flex items-center gap-2 text-[var(--color-text-secondary)]">
        <Server className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-medium tracking-widest uppercase">
          YOUR SERVER. YOUR WORLD.
        </span>
      </div>

      {/* Bottom Welcome Message & Security Pillar */}
      <div className="relative z-10 space-y-6 mt-8 sm:mt-12 lg:mt-0">
        <div className="space-y-3">
          <FlavorText variant="hero" />
          <p className="text-xs sm:text-[13px] text-[var(--color-text-secondary)] leading-[1.7] max-w-sm">
            Keep your community connected. Manage your servers, players, and everything in between.
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
            <span className="text-[10px] text-[var(--color-text-muted)] block leading-tight">
              Access managed by your workspace administrator
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
