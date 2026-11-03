import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { ArrowRight, UserRound } from 'lucide-react';

import { ApiError } from '@dsm/api-client';
import { Button, Checkbox, Input, PasswordInput } from '@dsm/ui';

import { useAuth } from '../auth.context';
import { type SignInFormValues, signInSchema } from '../signIn.schema';

export function SignInForm() {
  const { login } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: SignInFormValues) => {
    try {
      await login(values);
      await router.invalidate();
      const targetUrl =
        typeof search?.redirect === 'string' &&
        search.redirect.startsWith('/') &&
        !search.redirect.startsWith('//')
          ? search.redirect
          : '/dashboard';
      await navigate({ to: targetUrl });
    } catch (err) {
      let message = 'Invalid credentials. Please try again.';
      if (err instanceof ApiError && err.apiMessage) {
        message = err.apiMessage;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError('root', { message });
    }
  };

  return (
    <div className="flex-1 p-5 sm:p-8 lg:p-10 xl:p-[48px_72px] flex flex-col justify-center bg-[var(--color-surface)]">
      <div className="space-y-6">
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errors.root?.message && (
            <div
              role="alert"
              className="p-3 text-xs rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] text-[var(--color-danger)] font-medium"
            >
              {errors.root.message}
            </div>
          )}

          <Input
            label="Username or email"
            id="username"
            leftIcon={UserRound}
            type="text"
            placeholder="Enter your username or email"
            autoComplete="username"
            error={errors.usernameOrEmail?.message}
            {...register('usernameOrEmail')}
          />

          <PasswordInput
            label="Password"
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Remember Me */}
          <Checkbox
            label="Remember me on this device"
            containerClassName="pt-1"
            {...register('rememberMe')}
          />

          {/* Action Button */}
          <Button
            type="submit"
            variant="primary"
            rightIcon={ArrowRight}
            isLoading={isSubmitting}
            fullWidth
            className="mt-1"
          >
            Sign in
          </Button>
        </form>

        {/* Assistance Footer */}
        <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-1">
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
            Trouble signing in?
          </span>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-[1.65]">
            Contact your workspace administrator for your credentials or to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
