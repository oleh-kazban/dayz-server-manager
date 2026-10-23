import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, UserRound } from 'lucide-react';

import { Checkbox, Input, PasswordInput } from '@dsm/ui';

import { useAuth } from '../auth.context';
import { SignInFormValues, signInSchema } from '../signIn.schema';

export function SignInForm() {
  const { login } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (values: SignInFormValues) => {
    login(values);
    await router.invalidate();
    await navigate({ to: '/dashboard' });
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
