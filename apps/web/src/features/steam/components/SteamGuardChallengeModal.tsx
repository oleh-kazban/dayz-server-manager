import { useEffect, useState } from 'react';

import { KeyRound, Radio, ShieldAlert, X } from 'lucide-react';

import type { SteamChallengeEventDto } from '@aegis/api-contracts';
import { Button, Input, ProgressBar } from '@aegis/ui';

export interface SteamGuardChallengeModalProps {
  challenge: SteamChallengeEventDto | null;
  onSubmitOtp: (code: string) => Promise<void>;
  onAbort: () => void;
}

interface SteamGuardChallengeDialogProps {
  challenge: SteamChallengeEventDto;
  onSubmitOtp: (code: string) => Promise<void>;
  onAbort: () => void;
}

function SteamGuardChallengeDialog({
  challenge,
  onSubmitOtp,
  onAbort,
}: SteamGuardChallengeDialogProps) {
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(challenge.timeoutSeconds || 90);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isOtp = challenge.type === 'OTP_CODE';
  const totalSeconds = challenge.timeoutSeconds || 90;
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5);
    setOtpCode(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 5 || submitting) return;

    setSubmitting(true);
    try {
      await onSubmitOtp(otpCode);
    } catch {
      // Error handled in parent/hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="steam-guard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              {isOtp ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <Radio className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h2
                id="steam-guard-modal-title"
                className="text-base font-semibold text-[var(--color-text-main)]"
              >
                {isOtp ? 'Steam Guard Code Required' : 'Steam Mobile Push Confirmation'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isOtp
                  ? 'Enter the 5-character OTP verification code'
                  : 'Approve the login prompt on your mobile device'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            onClick={onAbort}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] font-mono">
            <span>Challenge Timeout</span>
            <span className={remainingSeconds < 20 ? 'text-[var(--color-danger)] font-bold' : ''}>
              {remainingSeconds}s remaining
            </span>
          </div>
          <ProgressBar
            value={progressPercent}
            size="sm"
            variant={remainingSeconds < 20 ? 'danger' : 'primary'}
          />
        </div>

        {isOtp ? (
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Input
                label="Steam Guard Code"
                placeholder="5 characters (e.g. 8K9B2)"
                value={otpCode}
                onChange={handleOtpChange}
                maxLength={5}
                className="font-mono text-center text-lg tracking-widest uppercase"
                autoFocus
              />
              <p className="text-xs text-[var(--color-text-muted)]">
                Check your Steam Mobile Authenticator or associated account email.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={onAbort}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={otpCode.length !== 5 || submitting || remainingSeconds === 0}
                isLoading={submitting}
              >
                Submit Code
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 text-center py-4">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                <Radio className="w-10 h-10 animate-ping absolute opacity-30" />
                <ShieldAlert className="w-8 h-8 relative z-10" />
              </div>
            </div>

            <div className="space-y-1 max-w-xs mx-auto">
              <p className="text-sm font-medium text-[var(--color-text-main)]">
                Waiting for Steam Mobile App confirmation...
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Open the Steam app on your smartphone and tap &ldquo;Approve&rdquo; to complete
                authentication.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="ghost" onClick={onAbort}>
                Cancel Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SteamGuardChallengeModal(props: SteamGuardChallengeModalProps) {
  if (!props.challenge) return null;
  return (
    <SteamGuardChallengeDialog
      key={props.challenge.challengeId}
      challenge={props.challenge}
      onSubmitOtp={props.onSubmitOtp}
      onAbort={props.onAbort}
    />
  );
}
