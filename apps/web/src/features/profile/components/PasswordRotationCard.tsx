import { useRef, useState } from 'react';

import { KeyRound, ShieldAlert } from 'lucide-react';

import { Card, Notice, PasswordInput } from '@aegis/ui';
import { SaveButton } from '@aegis/web/components';
import { notifyApiError, notifySuccess, useEditableForm } from '@aegis/web/core';

import { useChangePasswordMutation } from '../api/profile.mutations';

import { PasswordStrengthBar } from './PasswordStrengthBar';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

function validateNewPassword(password: string): string | undefined {
  if (password.length < 8) return 'New password must be at least 8 characters in length.';
  if (password.length > 64) return 'New password must not exceed 64 characters.';
  if (!/\d/.test(password)) return 'Password must contain at least 1 number.';
  if (!/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`\\]/.test(password)) {
    return 'Password must contain at least 1 special symbol.';
  }
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter.';
  if (/\s/.test(password)) return 'Whitespace is not permitted in passwords.';
  return undefined;
}

type PasswordValues = Record<PasswordField, string>;

const EMPTY_PASSWORD_VALUES: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function validatePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
}: PasswordValues): Partial<Record<PasswordField, string>> {
  const errors: Partial<Record<PasswordField, string>> = {};
  if (!currentPassword) errors.currentPassword = 'Current password is required.';
  const newPasswordError = validateNewPassword(newPassword);
  if (newPasswordError) {
    errors.newPassword = newPasswordError;
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'New password and confirmation do not match.';
  }
  return errors;
}

export function PasswordRotationCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useChangePasswordMutation();
  const inFlightRef = useRef(false);

  const {
    registerForm,
    hasChanges,
    errors: fieldErrors,
    handleSubmit,
    reportServerErrors,
    markSaved,
  } = useEditableForm({
    values: { currentPassword, newPassword, confirmPassword },
    baseline: EMPTY_PASSWORD_VALUES,
    validate: validatePasswordForm,
    isPending: changePasswordMutation.isPending,
  });

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const submitValidForm = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
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
          markSaved();
          notifySuccess('PASSWORD_ROTATED');
        },
        onError: (err: unknown) => {
          reportServerErrors(err);
          notifyApiError(err, 'Password Rotation Failed');
        },
        onSettled: () => {
          inFlightRef.current = false;
        },
      },
    );
  };

  return (
    <Card
      title="Security & Password Rotation"
      subtitle="Update account authentication credentials. Auto-terminates other active device sessions."
    >
      <form
        ref={registerForm}
        noValidate
        onSubmit={e => handleSubmit(e, submitValidForm)}
        className="space-y-6"
      >
        <Notice variant="warning" title="Session Invalidation Policy" icon={ShieldAlert}>
          Rotating your password immediately invalidates all active tokens and sessions on other
          browsers and workstations. Your current session will remain authenticated.
        </Notice>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <PasswordInput
            id="current-password-input"
            label="Current Password"
            placeholder="••••••••••••"
            value={currentPassword}
            error={fieldErrors.currentPassword}
            onChange={e => {
              setCurrentPassword(e.target.value);
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
              error={fieldErrors.newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
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
            error={
              fieldErrors.confirmPassword ??
              (confirmMismatch ? 'Passwords do not match' : undefined)
            }
            onChange={e => {
              setConfirmPassword(e.target.value);
            }}
            disabled={changePasswordMutation.isPending}
            required
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--color-border-subtle)]">
          <SaveButton
            type="submit"
            hasChanges={hasChanges}
            isPending={changePasswordMutation.isPending}
            leftIcon={KeyRound}
          >
            Rotate Credentials
          </SaveButton>
        </div>
      </form>
    </Card>
  );
}
