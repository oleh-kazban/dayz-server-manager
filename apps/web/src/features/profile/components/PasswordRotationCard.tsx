import { useState } from 'react';

import { KeyRound, ShieldAlert } from 'lucide-react';

import { Button, Card, Notice, PasswordInput, showToast } from '@aegis/ui';

import { useChangePasswordMutation } from '../api/profile.mutations';

import { PasswordStrengthBar } from './PasswordStrengthBar';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const response = record.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
}

export function PasswordRotationCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const changePasswordMutation = useChangePasswordMutation();

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentPassword) {
      setValidationError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters in length.');
      return;
    }

    if (newPassword.length > 64) {
      setValidationError('New password must not exceed 64 characters.');
      return;
    }

    if (!/[\d\W_]/.test(newPassword)) {
      setValidationError('New password must contain at least 1 number or special character.');
      return;
    }

    if (!/\d/.test(newPassword)) {
      setValidationError('Password must contain at least 1 number.');
      return;
    }

    if (!/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`\\]/.test(newPassword)) {
      setValidationError('Password must contain at least 1 special symbol.');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setValidationError('Password must contain at least 1 lowercase letter.');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setValidationError('Password must contain at least 1 uppercase letter.');
      return;
    }

    if (/\s/.test(newPassword)) {
      setValidationError('Whitespace is not permitted in passwords.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirmation do not match.');
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          showToast.success(
            'Password Rotated',
            'Your password was updated and all other active sessions have been invalidated.',
          );
        },
        onError: (err: unknown) => {
          showToast.error(
            'Rotation Refused',
            extractErrorMessage(err, 'Failed to rotate password'),
          );
        },
      },
    );
  };

  return (
    <Card
      title="Security & Password Rotation"
      subtitle="Update account authentication credentials. Auto-terminates other active device sessions."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Notice variant="warning" title="Session Invalidation Policy" icon={ShieldAlert}>
          Rotating your password immediately invalidates all active tokens and sessions on other
          browsers and workstations. Your current session will remain authenticated.
        </Notice>

        {validationError && (
          <div className="p-3 rounded-lg border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)] text-sm">
            {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <PasswordInput
            id="current-password-input"
            label="Current Password"
            placeholder="••••••••••••"
            value={currentPassword}
            onChange={e => {
              setCurrentPassword(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={changePasswordMutation.isPending}
            required
          />

          <div>
            <PasswordInput
              id="new-password-input"
              label="New Password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={changePasswordMutation.isPending}
              required
            />
            <PasswordStrengthBar password={newPassword} />
          </div>

          <PasswordInput
            id="confirm-password-input"
            label="Confirm New Password"
            placeholder="••••••••••••"
            value={confirmPassword}
            error={confirmMismatch ? 'Passwords do not match' : undefined}
            onChange={e => {
              setConfirmPassword(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={changePasswordMutation.isPending}
            required
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--color-border-subtle)]">
          <Button
            type="submit"
            variant="primary"
            isLoading={changePasswordMutation.isPending}
            leftIcon={KeyRound}
          >
            Rotate Credentials
          </Button>
        </div>
      </form>
    </Card>
  );
}
