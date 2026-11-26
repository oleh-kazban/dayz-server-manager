import { useEffect, useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, UserRound } from 'lucide-react';

import { apiClient, ApiError } from '@aegis/api-client';
import type { SetupRootRequestDto } from '@aegis/api-contracts';
import { Button, Input, Notice, PasswordInput } from '@aegis/ui';
import {
  notifyApiError,
  notifySuccess,
  resolveApiErrorMessage,
  useEditableForm,
} from '@aegis/web/core';

import { useAuth } from '../auth.context';
import { validateSetupForm } from '../setup.schema';

const FAILURE_TITLE = 'Could not create the root account';
const NETWORK_DESCRIPTION = 'Could not reach the server. Check your connection and try again.';
const UNEXPECTED_DESCRIPTION = 'An unexpected error occurred. Please try again.';
const SESSION_ENDED_CODES = ['AUTH_SETUP_SESSION_EXPIRED', 'AUTH_SETUP_ALREADY_COMPLETE'];

export function SetupForm() {
  const { logout, adoptSession } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const inFlightRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (dto: SetupRootRequestDto) => apiClient.setup.setupRoot(dto),
  });

  const { registerForm, errors, handleSubmit, reportServerErrors, releaseUnsavedChanges } =
    useEditableForm({
      values: { username, password, confirmPassword },
      baseline: null,
      validate: validateSetupForm,
      isPending: mutation.isPending,
    });

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (alertMessage && !mutation.isPending) {
      submitRef.current?.focus();
    }
  }, [alertMessage, mutation.isPending]);

  const leaveToSignIn = () => {
    logout();
    void router.invalidate();
    void navigate({ to: '/sign-in', replace: true });
  };

  const submitValidForm = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setAlertMessage(null);
    mutation.mutate(
      { username, password, confirmPassword },
      {
        onSuccess: async response => {
          releaseUnsavedChanges();
          adoptSession(response);
          notifySuccess('ROOT_ACCOUNT_CREATED');
          await router.invalidate();
          await navigate({ to: '/dashboard', replace: true });
        },
        onError: (err: unknown) => {
          // A fetch failure carries the browser's text ("Failed to fetch"); show a readable one.
          const reported = err instanceof ApiError ? err : null;
          const fallback = reported ? UNEXPECTED_DESCRIPTION : NETWORK_DESCRIPTION;
          reportServerErrors(err);
          notifyApiError(reported, FAILURE_TITLE, fallback);
          if (
            reported &&
            (reported.status === 401 ||
              (reported.errorCode && SESSION_ENDED_CODES.includes(reported.errorCode)))
          ) {
            leaveToSignIn();
            return;
          }
          if (!reported?.fieldErrors || Object.keys(reported.fieldErrors).length === 0) {
            setAlertMessage(resolveApiErrorMessage(reported, FAILURE_TITLE, fallback).description);
          }
        },
        onSettled: () => {
          inFlightRef.current = false;
        },
      },
    );
  };

  const disabled = mutation.isPending;

  return (
    <div className="flex-1 p-5 sm:p-8 lg:p-10 xl:p-[48px_72px] flex flex-col justify-center bg-[var(--color-surface)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
            FIRST-TIME SETUP
          </span>
          <h2
            id="setup-heading"
            className="text-2xl sm:text-[28px] font-normal text-[var(--color-text-main)] tracking-tight"
          >
            Create the root account
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-[1.6]">
            This account owns this Aegis installation. You can add other administrators later.
          </p>
        </div>

        <Notice variant="info">
          You are signed in with a temporary setup account. It is deleted when you finish.
        </Notice>

        <form
          ref={registerForm}
          aria-labelledby="setup-heading"
          onSubmit={e => handleSubmit(e, submitValidForm)}
          className="space-y-4"
          noValidate
        >
          {alertMessage && (
            <div
              role="alert"
              className="p-3 text-xs rounded-lg border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)] font-medium [overflow-wrap:anywhere]"
            >
              {alertMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <Input
              ref={usernameRef}
              label="Username"
              id="setup-username"
              name="username"
              leftIcon={UserRound}
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="setup-username-hint"
              value={username}
              error={errors.username}
              disabled={disabled}
              onChange={e => {
                setUsername(e.target.value);
              }}
            />
            <p id="setup-username-hint" className="text-[11px] text-[var(--color-text-muted)]">
              {'3 to 32 characters: letters, digits, ".", "_" and "-".'}
            </p>
          </div>

          <div className="space-y-1.5">
            <PasswordInput
              label="Password"
              id="setup-password"
              placeholder="Choose a password"
              autoComplete="new-password"
              aria-describedby="setup-password-hint"
              value={password}
              error={errors.password}
              disabled={disabled}
              onChange={e => {
                setPassword(e.target.value);
              }}
            />
            <p id="setup-password-hint" className="text-[11px] text-[var(--color-text-muted)]">
              8 to 64 characters with at least one digit, one lowercase letter, one uppercase letter
              and one special symbol. No spaces.
            </p>
          </div>

          <PasswordInput
            label="Confirm password"
            id="setup-confirm-password"
            placeholder="Repeat the password"
            autoComplete="new-password"
            value={confirmPassword}
            error={errors.confirmPassword}
            disabled={disabled}
            onChange={e => {
              setConfirmPassword(e.target.value);
            }}
          />

          <Button
            ref={submitRef}
            type="submit"
            variant="primary"
            rightIcon={ArrowRight}
            isLoading={disabled}
            fullWidth
            className="mt-1"
          >
            Create root account
          </Button>
          <Button type="button" variant="ghost" fullWidth onClick={leaveToSignIn}>
            Sign out
          </Button>
        </form>

        <div className="pt-4 border-t border-[var(--color-border-subtle)]">
          <p className="text-[11px] text-[var(--color-text-muted)] leading-[1.65]">
            Setup session expired? Restart Aegis. It creates new setup credentials and prints where
            it saved them.
          </p>
        </div>
      </div>
    </div>
  );
}
