import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import * as mutationsModule from '../api/profile.mutations';
import * as queriesModule from '../api/profile.queries';

import { ActiveSessionsCard } from './ActiveSessionsCard';

vi.mock('@aegis/ui', async () => {
  const actual = await vi.importActual<typeof import('@aegis/ui')>('@aegis/ui');
  return {
    ...actual,
    showToast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('ActiveSessionsCard', () => {
  const mockRevokeSingle = vi.fn();
  const mockRevokeBulk = vi.fn();

  const mockSessions: SessionDto[] = [
    {
      id: 'sess-current',
      deviceSummary: 'Chrome on Windows',
      ipAddress: '127.0.0.1',
      lastActiveAt: new Date(Date.now() - 10_000).toISOString(), // just now
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      isCurrent: true,
    },
    {
      id: 'sess-remote-1',
      deviceSummary: 'Mobile Safari on iOS',
      ipAddress: '127.0.0.2',
      lastActiveAt: new Date(Date.now() - 120_000).toISOString(), // 2 minutes ago
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      isCurrent: false,
    },
    {
      id: 'sess-remote-2',
      deviceSummary: 'Firefox on Linux',
      ipAddress: '127.0.0.3',
      lastActiveAt: new Date(Date.now() - 7200_000).toISOString(), // 2 hours ago
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      isCurrent: false,
    },
    {
      id: 'sess-remote-3',
      deviceSummary: 'Chrome on Android',
      ipAddress: '127.0.0.4',
      lastActiveAt: new Date(Date.now() - 172800_000).toISOString(), // 2 days ago
      createdAt: new Date(Date.now() - 200000_000).toISOString(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      isCurrent: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queriesModule, 'useSessionsQuery').mockReturnValue({
      data: { sessions: mockSessions, totalCount: mockSessions.length },
      isLoading: false,
    } as unknown as ReturnType<typeof queriesModule.useSessionsQuery>);

    vi.spyOn(mutationsModule, 'useRevokeSessionMutation').mockReturnValue({
      mutate: mockRevokeSingle,
      isPending: false,
      variables: undefined,
    } as unknown as ReturnType<typeof mutationsModule.useRevokeSessionMutation>);

    vi.spyOn(mutationsModule, 'useRevokeOtherSessionsMutation').mockReturnValue({
      mutate: mockRevokeBulk,
      isPending: false,
    } as unknown as ReturnType<typeof mutationsModule.useRevokeOtherSessionsMutation>);
  });

  it('renders loading state when query is loading', () => {
    vi.spyOn(queriesModule, 'useSessionsQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof queriesModule.useSessionsQuery>);

    render(<ActiveSessionsCard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders empty state when session list is empty', () => {
    vi.spyOn(queriesModule, 'useSessionsQuery').mockReturnValue({
      data: { sessions: [], totalCount: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof queriesModule.useSessionsQuery>);

    render(<ActiveSessionsCard />);
    expect(screen.getByText('No active sessions recorded.')).toBeInTheDocument();
  });

  it('renders sessions list with device summaries, current badge, and relative times', () => {
    render(<ActiveSessionsCard />);

    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Current Session')).toBeInTheDocument();
    expect(screen.getByText('Mobile Safari on iOS')).toBeInTheDocument();
    expect(screen.getByText('Firefox on Linux')).toBeInTheDocument();
    expect(screen.getByText('Chrome on Android')).toBeInTheDocument();

    expect(screen.getByText('Active just now')).toBeInTheDocument();
    expect(screen.getByText('Active 2 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('Active 2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Active 2 days ago')).toBeInTheDocument();
  });

  it('terminates a single remote session immediately without confirmation modal', () => {
    render(<ActiveSessionsCard />);

    const terminateBtns = screen.getAllByRole('button', { name: 'Terminate' });
    fireEvent.click(terminateBtns[0]); // sess-remote-1

    expect(mockRevokeSingle).toHaveBeenCalledWith(
      { id: 'sess-remote-1', isCurrent: false },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );

    const options = mockRevokeSingle.mock.calls[0][1];
    options.onSuccess();
    expect(showToast.success).toHaveBeenCalledWith(
      'Session Terminated',
      'The device session has been revoked.',
    );

    options.onError(new Error('Revocation failed'));
    expect(showToast.error).toHaveBeenCalledWith('Revocation Failed', 'Revocation failed');

    options.onError('plain error');
    expect(showToast.error).toHaveBeenCalledWith('Revocation Failed', 'Failed to revoke session');
  });

  it('opens confirmation modal when clicking sign out on current session', () => {
    render(<ActiveSessionsCard />);

    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutBtn);

    expect(screen.getByText('Sign Out Current Session?')).toBeInTheDocument();

    // Confirm sign out
    const confirmBtn = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(confirmBtn);

    expect(mockRevokeSingle).toHaveBeenCalledWith(
      { id: 'sess-current', isCurrent: true },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    const options = mockRevokeSingle.mock.calls[0][1];
    options.onSuccess();
    expect(showToast.info).toHaveBeenCalledWith(
      'Signed Out',
      'Your current session was terminated.',
    );
  });

  it('allows canceling current session sign out modal', () => {
    render(<ActiveSessionsCard />);

    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutBtn);
    expect(screen.getByText('Sign Out Current Session?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Sign Out Current Session?')).not.toBeInTheDocument();
    expect(mockRevokeSingle).not.toHaveBeenCalled();
  });

  it('allows canceling bulk revocation modal', () => {
    render(<ActiveSessionsCard />);

    const bulkBtn = screen.getByRole('button', {
      name: /Terminate All Other Active Sessions/i,
    });
    fireEvent.click(bulkBtn);
    expect(screen.getByText('Terminate All Other Active Sessions?')).toBeInTheDocument();

    const keepActiveBtn = screen.getByRole('button', { name: 'Keep Active' });
    fireEvent.click(keepActiveBtn);

    expect(screen.queryByText('Terminate All Other Active Sessions?')).not.toBeInTheDocument();
    expect(mockRevokeBulk).not.toHaveBeenCalled();
  });

  it('handles singular count in bulk revocation message and error fallback', () => {
    render(<ActiveSessionsCard />);

    const bulkBtn = screen.getByRole('button', {
      name: /Terminate All Other Active Sessions/i,
    });
    fireEvent.click(bulkBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Terminate Sessions' });
    fireEvent.click(confirmBtn);

    const options = mockRevokeBulk.mock.calls[0][1];
    options.onSuccess({ revokedCount: 1, message: 'Success' });
    expect(showToast.success).toHaveBeenCalledWith(
      'Sessions Terminated',
      'Successfully terminated 1 other session.',
    );

    // Fallback when error object has no message
    options.onError({});
    expect(showToast.error).toHaveBeenCalledWith(
      'Bulk Revocation Failed',
      'Failed to terminate other sessions',
    );
  });

  it('formats singular relative times (1 minute, 1 hour, 1 day)', () => {
    const singularSessions: SessionDto[] = [
      {
        id: 's-1min',
        deviceSummary: 'Device A',
        ipAddress: '127.0.0.1',
        lastActiveAt: new Date(Date.now() - 65_000).toISOString(), // 1 minute ago
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isCurrent: false,
      },
      {
        id: 's-1hr',
        deviceSummary: 'Device B',
        ipAddress: '127.0.0.1',
        lastActiveAt: new Date(Date.now() - 3660_000).toISOString(), // 1 hour ago
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isCurrent: false,
      },
      {
        id: 's-1day',
        deviceSummary: 'Device C',
        ipAddress: '127.0.0.1',
        lastActiveAt: new Date(Date.now() - 86500_000).toISOString(), // 1 day ago
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isCurrent: false,
      },
    ];

    vi.spyOn(queriesModule, 'useSessionsQuery').mockReturnValue({
      data: { sessions: singularSessions, totalCount: 3 },
      isLoading: false,
    } as unknown as ReturnType<typeof queriesModule.useSessionsQuery>);

    render(<ActiveSessionsCard />);

    expect(screen.getByText('Active 1 minute ago')).toBeInTheDocument();
    expect(screen.getByText('Active 1 hour ago')).toBeInTheDocument();
    expect(screen.getByText('Active 1 day ago')).toBeInTheDocument();
  });

  it('opens confirmation modal and terminates all other sessions on bulk action', () => {
    render(<ActiveSessionsCard />);

    const bulkBtn = screen.getByRole('button', {
      name: /Terminate All Other Active Sessions/i,
    });
    fireEvent.click(bulkBtn);

    expect(screen.getByText('Terminate All Other Active Sessions?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Terminate Sessions' });
    fireEvent.click(confirmBtn);

    expect(mockRevokeBulk).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );

    const options = mockRevokeBulk.mock.calls[0][1];
    options.onSuccess({ revokedCount: 3, message: 'Success' });
    expect(showToast.success).toHaveBeenCalledWith(
      'Sessions Terminated',
      'Successfully terminated 3 other sessions.',
    );

    options.onError(new Error('Network error'));
    expect(showToast.error).toHaveBeenCalledWith('Bulk Revocation Failed', 'Network error');
  });
});
