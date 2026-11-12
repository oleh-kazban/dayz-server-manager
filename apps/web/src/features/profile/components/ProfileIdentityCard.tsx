import { useRef, useState } from 'react';

import { Check, Globe, Mail, Shield, User } from 'lucide-react';
import { z } from 'zod';

import type { UserProfileDto } from '@aegis/api-contracts';
import { Button, Card, Input, Select, type SelectOption, showToast, Tag, Toggle } from '@aegis/ui';

import { useUpdateProfileMutation } from '../api/profile.mutations';

const emailSchema = z.string().email();

const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT / BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET / CEST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET / CEST)' },
  { value: 'Europe/Kyiv', label: 'Europe/Kyiv (EET / EEST)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST / AEDT)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST / NZDT)' },
];

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

export interface ProfileIdentityCardProps {
  profile?: UserProfileDto;
  isLoading?: boolean;
}

export function ProfileIdentityCard({ profile, isLoading }: ProfileIdentityCardProps) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'UTC');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(profile?.timeFormat ?? '24h');
  const [emailError, setEmailError] = useState<string | undefined>();

  const updateProfileMutation = useUpdateProfileMutation();
  const inFlightRef = useRef(false);

  const timezoneOptions: SelectOption<string>[] = (() => {
    const opts = COMMON_TIMEZONES.map(tz => ({
      value: tz.value,
      label: tz.label,
    }));
    if (timezone && !opts.some(o => o.value === timezone)) {
      opts.unshift({ value: timezone, label: timezone });
    }
    return opts;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateProfileMutation.isPending || inFlightRef.current) return;

    if (email.trim()) {
      const emailParse = emailSchema.safeParse(email.trim());
      if (!emailParse.success) {
        setEmailError('Please enter a valid email address');
        return;
      }
    }
    setEmailError(undefined);
    inFlightRef.current = true;

    updateProfileMutation.mutate(
      {
        displayName: displayName.trim() || null,
        email: email.trim() || null,
        timezone,
        timeFormat,
      },
      {
        onSuccess: () => {
          showToast.success(
            'Profile updated',
            'Your identity and regional preferences have been saved.',
          );
        },
        onError: (err: unknown) => {
          showToast.error('Update failed', extractErrorMessage(err, 'Failed to update profile'));
        },
        onSettled: () => {
          inFlightRef.current = false;
        },
      },
    );
  };

  let roleColor: 'danger' | 'amber' | 'gray' = 'gray';
  if (profile?.role === 'admin') {
    roleColor = 'danger';
  } else if (profile?.role === 'moderator') {
    roleColor = 'amber';
  }

  return (
    <Card
      title="Identity & Regional Settings"
      subtitle="Manage your operator callsign, contact credentials, and localized temporal display."
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Operator Handle (Immutable)
            </span>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
              <User className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span className="font-mono text-sm font-semibold text-[var(--color-text-main)] truncate">
                {profile?.username ?? '—'}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Login handle assigned at node provision.
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Assigned Security Role
            </span>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]">
              <Shield className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <Tag color={roleColor} variant="subtle">
                {(profile?.role ?? 'viewer').toUpperCase()}
              </Tag>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Role permissions are managed globally in Operators settings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="operator-display-name"
              label="Display Name (Callsign)"
              placeholder="e.g. Major Kovac"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={isLoading || updateProfileMutation.isPending}
              leftIcon={User}
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Personal moniker displayed across UI headers and logs.
            </p>
          </div>

          <div>
            <Input
              id="operator-email"
              type="email"
              label="Notification Email"
              placeholder="operator@dayz-node.local"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError(undefined);
              }}
              error={emailError}
              disabled={isLoading || updateProfileMutation.isPending}
              leftIcon={Mail}
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Recipient address for server health and watchdog notifications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <Select
              id="operator-timezone"
              label="Regional Timezone"
              options={timezoneOptions}
              value={timezone}
              onChange={val => {
                if (val) setTimezone(val);
              }}
              disabled={isLoading || updateProfileMutation.isPending}
              leftIcon={Globe}
              helperText="RPT diagnostics and ADM combat logs will align to this timezone."
            />
          </div>

          <div className="flex flex-col justify-center pt-2">
            <Toggle
              id="operator-time-format-toggle"
              label="24-Hour Time Format"
              description="Display operational clocks in 24h format (e.g. 19:45 vs 7:45 PM)"
              checked={timeFormat === '24h'}
              onChange={e => setTimeFormat(e.target.checked ? '24h' : '12h')}
              disabled={isLoading || updateProfileMutation.isPending}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--color-border-subtle)]">
          <Button
            type="submit"
            variant="primary"
            isLoading={updateProfileMutation.isPending}
            disabled={isLoading}
            leftIcon={Check}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </Card>
  );
}
