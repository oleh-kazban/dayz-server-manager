import { useState } from 'react';

import { Laptop, LogOut, Smartphone } from 'lucide-react';

import type { SessionDto } from '@dsm/api-contracts';
import { Button, Card, Confirmation, Loader, showToast, Tag } from '@dsm/ui';

import { useRevokeOtherSessionsMutation, useRevokeSessionMutation } from '../api/profile.mutations';
import { useSessionsQuery } from '../api/profile.queries';

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Active just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Active ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Active ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `Active ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

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

export function ActiveSessionsCard() {
  const { data, isLoading } = useSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeOtherSessionsMutation = useRevokeOtherSessionsMutation();

  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [confirmCurrentId, setConfirmCurrentId] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  const handleRevokeSingle = (session: SessionDto) => {
    if (session.isCurrent) {
      setConfirmCurrentId(session.id);
      return;
    }

    revokeSessionMutation.mutate(
      { id: session.id, isCurrent: false },
      {
        onSuccess: () => {
          showToast.success('Session Terminated', 'The device session has been revoked.');
        },
        onError: (err: unknown) => {
          showToast.error(
            'Revocation Failed',
            extractErrorMessage(err, 'Failed to revoke session'),
          );
        },
      },
    );
  };

  const handleConfirmCurrentRevoke = () => {
    if (!confirmCurrentId) return;
    revokeSessionMutation.mutate(
      { id: confirmCurrentId, isCurrent: true },
      {
        onSuccess: () => {
          setConfirmCurrentId(null);
          showToast.info('Signed Out', 'Your current session was terminated.');
        },
      },
    );
  };

  const handleConfirmBulk = () => {
    revokeOtherSessionsMutation.mutate(undefined, {
      onSuccess: res => {
        setConfirmBulkOpen(false);
        showToast.success(
          'Sessions Terminated',
          `Successfully terminated ${res.revokedCount} other session${res.revokedCount === 1 ? '' : 's'}.`,
        );
      },
      onError: (err: unknown) => {
        showToast.error(
          'Bulk Revocation Failed',
          extractErrorMessage(err, 'Failed to terminate other sessions'),
        );
      },
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-8 flex justify-center">
          <Loader size="md" />
        </div>
      );
    }

    if (sessions.length === 0) {
      return (
        <div className="text-center py-6 text-sm text-[var(--color-text-muted)]">
          No active sessions recorded.
        </div>
      );
    }

    return (
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {sessions.map(session => {
          const isMobile =
            session.deviceSummary.includes('iOS') || session.deviceSummary.includes('Android');
          const DeviceIcon = isMobile ? Smartphone : Laptop;

          return (
            <div
              key={session.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] shrink-0">
                  <DeviceIcon className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--color-text-main)] truncate">
                      {session.deviceSummary}
                    </span>
                    {session.isCurrent && (
                      <Tag color="success" variant="solid">
                        Current Session
                      </Tag>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <span className="font-mono">{session.ipAddress || '127.0.0.1'}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(session.lastActiveAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center shrink-0">
                <Button
                  variant={session.isCurrent ? 'ghost' : 'secondary'}
                  onClick={() => handleRevokeSingle(session)}
                  isLoading={
                    revokeSessionMutation.isPending &&
                    revokeSessionMutation.variables?.id === session.id
                  }
                  leftIcon={LogOut}
                >
                  {session.isCurrent ? 'Sign out' : 'Terminate'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card
        title="Active Operator Sessions"
        subtitle="Stateful device sessions authorized with your credentials. Revoke remote devices immediately."
        actions={
          otherSessionsCount > 0 ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmBulkOpen(true)}
              disabled={revokeOtherSessionsMutation.isPending}
              leftIcon={LogOut}
            >
              Terminate All Other Active Sessions ({otherSessionsCount})
            </Button>
          ) : undefined
        }
      >
        {renderContent()}
      </Card>

      {/* Confirmation Dialog for Bulk Revocation */}
      {confirmBulkOpen && (
        <Confirmation
          title="Terminate All Other Active Sessions?"
          description={`This action will immediately invalidate all ${otherSessionsCount} active session${otherSessionsCount === 1 ? '' : 's'} on other devices. Operators will need to sign in again. Your current session will remain active.`}
          variant="danger"
          confirmLabel="Terminate Sessions"
          cancelLabel="Keep Active"
          isLoading={revokeOtherSessionsMutation.isPending}
          onConfirm={handleConfirmBulk}
          onCancel={() => setConfirmBulkOpen(false)}
        />
      )}

      {/* Confirmation Dialog for Terminating Current Session */}
      {confirmCurrentId && (
        <Confirmation
          title="Sign Out Current Session?"
          description="Terminating your current active session will immediately sign you out and return you to the login screen."
          variant="warning"
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          isLoading={revokeSessionMutation.isPending}
          onConfirm={handleConfirmCurrentRevoke}
          onCancel={() => setConfirmCurrentId(null)}
        />
      )}
    </>
  );
}
