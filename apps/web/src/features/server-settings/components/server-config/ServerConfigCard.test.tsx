import { forwardRef, useImperativeHandle } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type {
  ApiErrorParams,
  ConfigDiagnosticDto,
  ConfigRevisionDetailDto,
  ConfigRevisionSummaryDto,
  SaveServerDzConfigResponseDto,
  ServerDetailDto,
  ServerDzConfigResponseDto,
} from '@aegis/api-contracts';
import { renderServerDzTemplate } from '@aegis/dayz-config';
import { showToast } from '@aegis/ui';
import type { CodeDiffViewProps, CodeEditorHandle, CodeEditorProps } from '@aegis/ui/code-editor';
import { serverQueryKeys } from '@aegis/web/core';

import { serverConfigQueryKeys } from './server-config.queries';
import { ServerConfigCard } from './ServerConfigCard';

const mockFocus = vi.fn();
const mockRevealLine = vi.fn();

vi.mock('./code-editor.lazy', () => {
  const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function MockCodeEditor(
    { value, onChange, diagnostics, readOnly, ariaLabel },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      focus: mockFocus,
      revealLine: mockRevealLine,
    }));

    return (
      <textarea
        aria-label={ariaLabel}
        value={value}
        readOnly={readOnly}
        onChange={event => onChange?.(event.target.value)}
        data-diagnostics-count={String(diagnostics?.length ?? 0)}
      />
    );
  });

  function CodeDiffView({ original, modified, layout = 'unified', ariaLabel }: CodeDiffViewProps) {
    return (
      <div
        data-testid="code-diff-view"
        aria-label={ariaLabel}
        data-layout={layout}
        data-original={original}
        data-modified={modified}
      />
    );
  }

  return {
    default: CodeEditor,
    CodeDiffView,
  };
});

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      serverConfig: {
        getServerDzConfig: vi.fn(),
        validateServerDzConfig: vi.fn(),
        saveServerDzConfig: vi.fn(),
        bootstrapServerDzConfig: vi.fn(),
        acquireConfigLock: vi.fn(),
        heartbeatConfigLock: vi.fn(),
        releaseConfigLock: vi.fn(),
        listConfigRevisions: vi.fn(),
        getConfigRevision: vi.fn(),
        restoreConfigRevision: vi.fn(),
        syncBattlEyeConfig: vi.fn(),
      },
    },
  };
});

const SERVER_ID = '22222222-2222-4222-8222-222222222222';
const REV_1 = '11111111-1111-4111-8111-111111111111';
const REV_2 = '33333333-3333-4333-8333-333333333333';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

const VALID_CFG = renderServerDzTemplate({
  hostname: 'DayZ Namalsk',
  missionTemplate: 'dayzOffline.chernarusplus',
  steamQueryPort: 27016,
});

const CFG_WITHOUT_SECRETS = [
  'hostname = "DayZ Namalsk";',
  'maxPlayers = 60;',
  'steamQueryPort = 27016;',
  'class Missions',
  '{',
  '  class DayZ',
  '  {',
  '    template = "dayzOffline.chernarusplus";',
  '  };',
  '};',
].join('\n');

function buildRevisionSummary(
  overrides: Partial<ConfigRevisionSummaryDto> = {},
): ConfigRevisionSummaryDto {
  return {
    id: REV_1,
    source: 'editor',
    authorUserId: 'usr-1',
    authorName: 'admin',
    contentHash: HASH_A,
    createdAt: '2026-11-14T12:00:00.000Z',
    ...overrides,
  };
}

function buildConfigResponse(
  overrides: Partial<ServerDzConfigResponseDto> = {},
): ServerDzConfigResponseDto {
  return {
    exists: true,
    content: VALID_CFG,
    contentHash: HASH_A,
    eol: 'lf',
    hasBom: false,
    sizeBytes: VALID_CFG.length,
    projection: {
      missionTemplate: 'dayzOffline.chernarusplus',
      steamQueryPort: 27016,
      maxPlayers: 60,
    },
    serverRunning: false,
    lock: null,
    latestRevision: buildRevisionSummary(),
    ...overrides,
  };
}

function buildSaveResponse(
  overrides: Partial<SaveServerDzConfigResponseDto> = {},
): SaveServerDzConfigResponseDto {
  return {
    contentHash: HASH_B,
    projection: {
      missionTemplate: 'dayzOffline.chernarusplus',
      steamQueryPort: 27016,
      maxPlayers: 60,
    },
    diagnostics: [],
    revision: buildRevisionSummary({ id: REV_2, contentHash: HASH_B }),
    ...overrides,
  };
}

function buildServerDetail(overrides: Partial<ServerDetailDto> = {}): ServerDetailDto {
  return {
    id: SERVER_ID,
    name: 'DayZ Namalsk',
    description: null,
    status: 'stopped',
    gamePort: 2302,
    queryPort: 27016,
    rconPort: 2310,
    isDefault: false,
    createdAt: '2026-11-14T12:00:00.000Z',
    updatedAt: '2026-11-14T12:00:00.000Z',
    installPath: 'C:\\DayZServer\\Namalsk',
    profilePath: 'profiles',
    missionPath: 'mpmissions/dayzOffline.chernarusplus',
    launchParameters: null,
    maxPlayers: 60,
    rconIp: '127.0.0.1',
    rconPassword: 'rcon-secret-value',
    ...overrides,
  };
}

function makeApiError(
  errorCode: string,
  statusCode = 409,
  message = 'Operation failed',
  params?: ApiErrorParams,
): ApiError {
  return new ApiError(message, statusCode, {
    statusCode,
    error: errorCode,
    errorCode,
    message,
    ...(params !== undefined ? { params } : {}),
  });
}

function renderCard(
  queryClient: QueryClient,
  props: Partial<{ serverId: string; serverName: string; isServerRunning: boolean }> = {},
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ServerConfigCard
        serverId={props.serverId ?? SERVER_ID}
        serverName={props.serverName ?? 'DayZ Namalsk'}
        isServerRunning={props.isServerRunning ?? false}
      />
    </QueryClientProvider>,
  );
}

describe('ServerConfigCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(apiClient.serverConfig)) {
      vi.mocked(fn).mockReset();
    }
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    vi.mocked(apiClient.serverConfig.getServerDzConfig).mockResolvedValue(buildConfigResponse());
    vi.mocked(apiClient.serverConfig.acquireConfigLock).mockResolvedValue({
      holderUserId: 'usr-1',
      holderName: 'admin',
      acquiredAt: '2026-11-14T12:00:00.000Z',
      expiresAt: '2026-11-14T12:05:00.000Z',
      heldByYou: true,
    });
    vi.mocked(apiClient.serverConfig.heartbeatConfigLock).mockResolvedValue({
      holderUserId: 'usr-1',
      holderName: 'admin',
      acquiredAt: '2026-11-14T12:00:00.000Z',
      expiresAt: '2026-11-14T12:05:00.000Z',
      heldByYou: true,
    });
    vi.mocked(apiClient.serverConfig.releaseConfigLock).mockResolvedValue({ released: true });
    vi.mocked(apiClient.serverConfig.validateServerDzConfig).mockResolvedValue({
      valid: true,
      diagnostics: [],
    });
    vi.mocked(apiClient.serverConfig.saveServerDzConfig).mockResolvedValue(buildSaveResponse());
    vi.mocked(apiClient.serverConfig.bootstrapServerDzConfig).mockResolvedValue(
      buildSaveResponse({ revision: buildRevisionSummary({ source: 'template' }) }),
    );
    vi.mocked(apiClient.serverConfig.listConfigRevisions).mockResolvedValue([]);
    vi.mocked(apiClient.serverConfig.getConfigRevision).mockResolvedValue({
      ...buildRevisionSummary(),
      content: VALID_CFG,
    } satisfies ConfigRevisionDetailDto);
    vi.mocked(apiClient.serverConfig.restoreConfigRevision).mockResolvedValue(
      buildSaveResponse({ revision: buildRevisionSummary({ source: 'restore' }) }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading skeleton and handles load failure with Retry', async () => {
    let rejectFirstLoad!: (err: Error) => void;
    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirstLoad = reject;
        }),
      )
      .mockResolvedValueOnce(buildConfigResponse());

    const { container } = renderCard(queryClient);

    expect(container.querySelector('[aria-busy="true"], .animate-pulse')).not.toBeNull();
    expect(screen.queryByLabelText('serverDZ.cfg contents')).not.toBeInTheDocument();

    rejectFirstLoad(new Error('Disk read timed out'));

    expect(await screen.findByText('Unable to load serverDZ.cfg')).toBeInTheDocument();
    expect(screen.getByText('Disk read timed out')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByLabelText('serverDZ.cfg contents')).toBeInTheDocument();
    expect(apiClient.serverConfig.getServerDzConfig).toHaveBeenCalledTimes(2);
  });

  it('handles missing file state, server-running guard, and Create from template bootstrap flow', async () => {
    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockResolvedValueOnce(
        buildConfigResponse({
          exists: false,
          content: null,
          contentHash: null,
          projection: null,
          latestRevision: null,
          serverRunning: true,
        }),
      )
      .mockResolvedValueOnce(
        buildConfigResponse({
          exists: false,
          content: null,
          contentHash: null,
          projection: null,
          latestRevision: null,
          serverRunning: false,
        }),
      )
      .mockResolvedValueOnce(
        buildConfigResponse({
          exists: true,
          content: VALID_CFG,
          contentHash: HASH_B,
          latestRevision: buildRevisionSummary({ source: 'template', authorName: null }),
        }),
      );

    const { rerender } = renderCard(queryClient, { isServerRunning: true });

    expect(await screen.findByText('serverDZ.cfg does not exist')).toBeInTheDocument();
    expect(
      screen.getByText('Stop the server to create the file from the DSM template.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create from template' })).toBeDisabled();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ServerConfigCard serverId={SERVER_ID} serverName="DayZ Namalsk" isServerRunning={false} />
      </QueryClientProvider>,
    );
    await queryClient.invalidateQueries();

    const createButton = await screen.findByRole('button', { name: 'Create from template' });
    await waitFor(() => expect(createButton).toBeEnabled());

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(createButton);

    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    expect(editor).not.toHaveAttribute('readonly');
    expect(apiClient.serverConfig.acquireConfigLock).toHaveBeenCalledWith(SERVER_ID, {
      sessionToken: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      takeover: false,
    });
    expect(apiClient.serverConfig.bootstrapServerDzConfig).toHaveBeenCalledWith(SERVER_ID, {
      sessionToken: expect.stringMatching(/^[0-9a-f-]{36}$/i),
    });
    expect(showToast.success).toHaveBeenCalledWith(
      'serverDZ.cfg Created',
      'serverDZ.cfg for "DayZ Namalsk" was created from the DSM template.',
      undefined,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: serverConfigQueryKeys.revisions(SERVER_ID),
    });
    expect(screen.getByText(/Last change: Created from template/i)).toBeInTheDocument();
  });

  it('renders plaintext viewing mode metadata, focuses editor when entering Edit, and omits legacy secret banner', async () => {
    renderCard(queryClient);

    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    expect(editor).toHaveAttribute('readonly');
    expect((editor as HTMLTextAreaElement).value).toContain('password = "";');
    expect((editor as HTMLTextAreaElement).value).toContain('passwordAdmin = "";');
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
    expect(screen.getByText(/Last change: Saved in editor by admin/i)).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Password values are managed in Security & Credentials and cannot be edited here.',
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => {
      expect(editor).not.toHaveAttribute('readonly');
      expect(mockFocus).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(editor).toHaveAttribute('readonly'));

    cleanup();
    const secondClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.mocked(apiClient.serverConfig.getServerDzConfig).mockResolvedValueOnce(
      buildConfigResponse({
        content: CFG_WITHOUT_SECRETS,
        latestRevision: buildRevisionSummary({ source: 'external', authorName: null }),
      }),
    );

    renderCard(secondClient);

    const secondEditor = await screen.findByLabelText('serverDZ.cfg contents');
    expect(secondEditor).toHaveAttribute('readonly');
    expect(screen.getByText(/Last change: Modified outside DSM/i)).toBeInTheDocument();
  });

  it('disables Edit and displays running warning when isServerRunning is true', async () => {
    renderCard(queryClient, { isServerRunning: true });

    expect(await screen.findByText('Stop the server to edit')).toBeInTheDocument();
    expect(
      screen.getByText('serverDZ.cfg is read-only while the server is running.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  });

  it('displays lock holder banner and requires confirmation to take over another admin lock', async () => {
    const lockedResponse = buildConfigResponse({
      lock: {
        holderUserId: 'usr-2',
        holderName: 'Alice',
        acquiredAt: '2026-11-14T12:15:00.000Z',
        expiresAt: '2026-11-14T12:20:00.000Z',
        heldByYou: false,
      },
    });
    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockResolvedValueOnce(lockedResponse)
      .mockResolvedValueOnce(
        buildConfigResponse({
          lock: {
            holderUserId: 'usr-1',
            holderName: 'admin',
            acquiredAt: '2026-11-14T12:16:00.000Z',
            expiresAt: '2026-11-14T12:21:00.000Z',
            heldByYou: true,
          },
        }),
      );

    renderCard(queryClient);

    expect(await screen.findByText(/Being edited by Alice since/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Take over' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Take over editing?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Alice loses the edit lock and any unsaved changes in their editor.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Take over' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.acquireConfigLock).toHaveBeenCalledWith(SERVER_ID, {
        sessionToken: expect.any(String),
        takeover: true,
      });
    });
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    expect(editor).not.toHaveAttribute('readonly');
  });

  it('handles beginEditing failure by releasing detached lock and showing error toast', async () => {
    vi.mocked(apiClient.serverConfig.acquireConfigLock).mockRejectedValueOnce(
      makeApiError('CONFIG_LOCK_CONFLICT', 409, 'Already locked'),
    );

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(1);
      expect(showToast.error).toHaveBeenCalledWith(
        'Unable to Start Editing',
        'Already locked',
        undefined,
      );
    });
    expect(screen.getByLabelText('serverDZ.cfg contents')).toHaveAttribute('readonly');
  });

  it('manages editing lifecycle: Done when clean, Cancel -> Discard confirmation when dirty, pagehide, and unmount lock release', async () => {
    const view = renderCard(queryClient);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    expect(editor).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Clean exit uses Done and releases lock immediately without dialog
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    // Re-enter edit mode, dirty the draft, verify Cancel opens Discard confirmation
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editableArea = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editableArea).not.toHaveAttribute('readonly'));

    fireEvent.change(editableArea, { target: { value: `${VALID_CFG}\nmaxPlayers = 80;` } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const discardDialog = await screen.findByRole('alertdialog');
    expect(within(discardDialog).getByText('Discard unsaved changes?')).toBeInTheDocument();

    fireEvent.click(within(discardDialog).getByRole('button', { name: 'Discard' }));
    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByLabelText('serverDZ.cfg contents')).toHaveValue(VALID_CFG);

    // Re-enter edit mode and verify pagehide + unmount release lock once cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => {
      expect(screen.getByLabelText('serverDZ.cfg contents')).not.toHaveAttribute('readonly');
    });

    fireEvent(window, new Event('pagehide'));
    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(3);
    });

    view.unmount();
    // Already released on pagehide -> guarded by `held` flag
    expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(3);

    // Verify unmount directly releases when pagehide did not fire first
    const secondClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const secondView = renderCard(secondClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await waitFor(() => {
      expect(screen.getByLabelText('serverDZ.cfg contents')).not.toHaveAttribute('readonly');
    });
    secondView.unmount();
    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(4);
    });
  });

  it('rotates sessionToken across Edit -> Done -> Edit and saves with the fresh token (QA-05)', async () => {
    renderCard(queryClient);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const firstEditor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(firstEditor).not.toHaveAttribute('readonly'));

    const firstToken = vi.mocked(apiClient.serverConfig.acquireConfigLock).mock.calls[0]?.[1]
      .sessionToken;
    expect(firstToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledWith(SERVER_ID, {
        sessionToken: firstToken,
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const secondEditor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(secondEditor).not.toHaveAttribute('readonly'));

    const secondToken = vi.mocked(apiClient.serverConfig.acquireConfigLock).mock.calls[1]?.[1]
      .sessionToken;
    expect(secondToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(secondToken).not.toBe(firstToken);

    const edited = `${VALID_CFG}\nmaxPlayers = 75;`;
    fireEvent.change(secondEditor, { target: { value: edited } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.saveServerDzConfig).toHaveBeenCalledWith(SERVER_ID, {
        sessionToken: secondToken,
        baseHash: HASH_A,
        content: edited,
      });
    });
  });

  it('surfaces debounced live diagnostics, calls revealLine on diagnostic click, and runs server Validate', async () => {
    const serverDiag: ConfigDiagnosticDto = {
      severity: 'warning',
      code: 'NON_RECOMMENDED_VALUE',
      message: 'verifySignatures below 2 allows unsigned mods.',
      line: 2,
      column: 1,
      endLine: 2,
      endColumn: 20,
    };
    vi.mocked(apiClient.serverConfig.validateServerDzConfig)
      .mockResolvedValueOnce({ valid: true, diagnostics: [serverDiag] })
      .mockRejectedValueOnce(new Error('Validator unreachable'));

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

    expect(await screen.findByText('Live checks: no problems found.')).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: 'hostname = "Bad"' } });

    expect(await screen.findByText('Live checks')).toBeInTheDocument();
    const lnButton = screen.getByRole('button', { name: /Ln 1, Col 17/i });
    expect(lnButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(lnButton);
    expect(mockRevealLine).toHaveBeenCalledWith(1);

    fireEvent.change(editor, { target: { value: VALID_CFG } });
    expect(await screen.findByText('Live checks: no problems found.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText('Server validation')).toBeInTheDocument();
    expect(screen.getByText(/verifySignatures below 2 allows unsigned mods\./)).toBeInTheDocument();

    // Subsequent validation rejection triggers error toast
    fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Validation Failed',
        'Validator unreachable',
        undefined,
      );
    });
  });

  it('saves valid changes, resolves CONFIG_HASH_MISMATCH via Reload and Overwrite, and handles CONFIG_VALIDATION_FAILED', async () => {
    const updatedCfg = `${VALID_CFG}\n// edited`;
    const diskCfg = `${VALID_CFG}\n// external edit`;
    const serverValidationDiag: ConfigDiagnosticDto = {
      severity: 'error',
      code: 'STEAM_QUERY_PORT_CONFLICT',
      message: 'steamQueryPort conflicts with gamePort.',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 10,
    };

    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValueOnce(buildConfigResponse({ content: updatedCfg, contentHash: HASH_B }))
      .mockResolvedValueOnce(buildConfigResponse({ content: diskCfg, contentHash: HASH_C }))
      .mockResolvedValueOnce(buildConfigResponse({ content: diskCfg, contentHash: HASH_C }))
      .mockResolvedValueOnce(buildConfigResponse({ content: updatedCfg, contentHash: HASH_B }));

    vi.mocked(apiClient.serverConfig.saveServerDzConfig)
      .mockResolvedValueOnce(buildSaveResponse({ contentHash: HASH_B }))
      .mockRejectedValueOnce(makeApiError('CONFIG_VALIDATION_FAILED', 422, 'Validation error'))
      .mockRejectedValueOnce(makeApiError('CONFIG_HASH_MISMATCH', 409, 'Hash mismatch'))
      .mockRejectedValueOnce(makeApiError('CONFIG_HASH_MISMATCH', 409, 'Hash mismatch'))
      .mockResolvedValueOnce(buildSaveResponse({ contentHash: HASH_B }));

    vi.mocked(apiClient.serverConfig.validateServerDzConfig).mockResolvedValue({
      valid: false,
      diagnostics: [serverValidationDiag],
    });

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // 1. Clean Save success
    fireEvent.change(editor, { target: { value: updatedCfg } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.saveServerDzConfig).toHaveBeenCalledWith(SERVER_ID, {
        sessionToken: expect.any(String),
        baseHash: HASH_A,
        content: updatedCfg,
      });
      expect(showToast.success).toHaveBeenCalledWith(
        'serverDZ.cfg Saved',
        'serverDZ.cfg for "DayZ Namalsk" was validated and written to disk.',
        undefined,
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: serverConfigQueryKeys.revisions(SERVER_ID),
      });
    });
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    // 2. CONFIG_VALIDATION_FAILED falls back to validate endpoint for server diagnostics
    invalidateSpy.mockClear();
    fireEvent.change(editor, { target: { value: `${updatedCfg}\n// bad` } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Server validation')).toBeInTheDocument();
    expect(screen.getByText(/steamQueryPort conflicts with gamePort\./)).toBeInTheDocument();
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });

    // 3. CONFIG_HASH_MISMATCH -> Reload replaces draft with disk file
    fireEvent.change(editor, { target: { value: `${updatedCfg}\n// conflict 1` } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('serverDZ.cfg changed on disk')).toBeInTheDocument();
    expect(showToast.error).toHaveBeenCalledWith(
      'File Changed on Disk',
      'serverDZ.cfg was modified after it was loaded. Reload the file before writing again.',
      undefined,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    await waitFor(() => {
      expect(screen.queryByText('serverDZ.cfg changed on disk')).not.toBeInTheDocument();
      expect(editor).toHaveValue(diskCfg);
    });

    // 4. CONFIG_HASH_MISMATCH -> Overwrite -> confirmation -> uses latest contentHash (HASH_C)
    const draftToOverwrite = `${diskCfg}\n// force mine`;
    fireEvent.change(editor, { target: { value: draftToOverwrite } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('serverDZ.cfg changed on disk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));

    const overwriteDialog = await screen.findByRole('alertdialog');
    expect(within(overwriteDialog).getByText('Overwrite changes on disk?')).toBeInTheDocument();
    invalidateSpy.mockClear();
    fireEvent.click(within(overwriteDialog).getByRole('button', { name: 'Overwrite' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.saveServerDzConfig).toHaveBeenLastCalledWith(SERVER_ID, {
        sessionToken: expect.any(String),
        baseHash: HASH_C,
        content: draftToOverwrite,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: serverConfigQueryKeys.revisions(SERVER_ID),
      });
    });
  });

  it('transitions to lock-lost banner on save or heartbeat CONFIG_LOCK_NOT_HELD and dismisses it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValue(
        buildConfigResponse({
          lock: {
            holderUserId: 'usr-2',
            holderName: 'Alice',
            acquiredAt: '2026-11-14T12:20:00.000Z',
            expiresAt: '2026-11-14T12:25:00.000Z',
            heldByYou: false,
          },
        }),
      );
    vi.mocked(apiClient.serverConfig.heartbeatConfigLock).mockRejectedValueOnce(
      makeApiError('CONFIG_LOCK_NOT_HELD', 409, 'Lock taken over'),
    );

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

    const draftText = `${VALID_CFG}\n// preserved draft`;
    fireEvent.change(editor, { target: { value: draftText } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(await screen.findByText('Edit lock lost')).toBeInTheDocument();
    expect(screen.getByText(/Alice took over editing\./i)).toBeInTheDocument();
    expect(editor).toHaveValue(draftText);
    expect(editor).toHaveAttribute('readonly');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => {
      expect(screen.queryByText('Edit lock lost')).not.toBeInTheDocument();
    });
    expect(editor).toHaveValue(VALID_CFG);
  });

  it('transitions to lock-lost banner with expired message when save fails with CONFIG_LOCK_NOT_HELD', async () => {
    vi.mocked(apiClient.serverConfig.saveServerDzConfig).mockRejectedValueOnce(
      makeApiError('CONFIG_LOCK_NOT_HELD', 409, 'Lock expired'),
    );

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

    const draftText = `${VALID_CFG}\n// save after expiry`;
    fireEvent.change(editor, { target: { value: draftText } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Edit lock lost')).toBeInTheDocument();
    expect(screen.getByText(/Your edit session expired\./i)).toBeInTheDocument();
    expect(editor).toHaveValue(draftText);
    expect(editor).toHaveAttribute('readonly');
  });

  it('renders revision history empty/error states, diff layout toggle, and Restore flow', async () => {
    const rev1 = buildRevisionSummary({
      id: REV_1,
      source: 'editor',
      authorName: 'admin',
      createdAt: '2026-11-14T11:00:00.000Z',
    });
    const rev2 = buildRevisionSummary({
      id: REV_2,
      source: 'external',
      authorName: null,
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    const oldContent = `${VALID_CFG}\n// older revision`;

    vi.mocked(apiClient.serverConfig.listConfigRevisions)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('SQLite busy'))
      .mockResolvedValue([rev1, rev2]);

    vi.mocked(apiClient.serverConfig.getConfigRevision).mockResolvedValue({
      ...rev1,
      content: oldContent,
    });

    renderCard(queryClient);
    const historyBtn = await screen.findByRole('button', { name: 'History' });

    // 1. Empty revisions
    fireEvent.click(historyBtn);
    expect(await screen.findByText('No revisions recorded yet.')).toBeInTheDocument();

    // 2. Close & re-open -> error state
    fireEvent.click(historyBtn);
    await queryClient.invalidateQueries();
    fireEvent.click(historyBtn);
    expect(await screen.findByText('Revision history unavailable')).toBeInTheDocument();
    expect(screen.getByText('SQLite busy')).toBeInTheDocument();

    // 3. Re-open -> populated list, diff view, layout toggle, disabled Restore in viewing mode
    fireEvent.click(historyBtn);
    await queryClient.invalidateQueries();
    fireEvent.click(historyBtn);

    const revButton = await screen.findByRole('button', { name: /Saved in editor/i });
    expect(screen.getByText('Unknown author')).toBeInTheDocument();
    fireEvent.click(revButton);

    const diffView = await screen.findByTestId('code-diff-view');
    expect(diffView).toHaveAttribute('data-layout', 'unified');
    expect(diffView).toHaveAttribute('data-original', oldContent);
    expect(diffView).toHaveAttribute('data-modified', VALID_CFG);
    expect(screen.getByText('Click Edit to restore a revision.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Side by side' }));
    expect(screen.getByTestId('code-diff-view')).toHaveAttribute('data-layout', 'side-by-side');
    expect(screen.getByRole('button', { name: 'Unified' })).toBeInTheDocument();

    // 4. Enter editing mode -> Restore enabled -> Confirmation -> restoreConfigRevision called
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Restore' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    const restoreDialog = await screen.findByRole('alertdialog');
    expect(within(restoreDialog).getByText('Restore this revision?')).toBeInTheDocument();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(within(restoreDialog).getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(apiClient.serverConfig.restoreConfigRevision).toHaveBeenCalledWith(SERVER_ID, REV_1, {
        sessionToken: expect.any(String),
        baseHash: HASH_A,
      });
      expect(showToast.success).toHaveBeenCalledWith(
        'Revision Restored',
        'The selected revision of serverDZ.cfg for "DayZ Namalsk" was written to disk.',
        undefined,
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: serverConfigQueryKeys.revisions(SERVER_ID),
      });
    });
  });

  it('releases detached lock, notifies error, and returns to missing mode when bootstrapServerDzConfig fails', async () => {
    vi.mocked(apiClient.serverConfig.getServerDzConfig).mockResolvedValue(
      buildConfigResponse({
        exists: false,
        content: null,
        contentHash: null,
        projection: null,
        latestRevision: null,
        serverRunning: false,
      }),
    );
    vi.mocked(apiClient.serverConfig.bootstrapServerDzConfig).mockRejectedValueOnce(
      makeApiError('CONFIG_VALIDATION_FAILED', 422, 'Template error', {
        errorCount: 1,
        firstLine: 1,
        firstMessage: 'Mission folder missing',
      }),
    );

    renderCard(queryClient);
    const createButton = await screen.findByRole('button', { name: 'Create from template' });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(apiClient.serverConfig.acquireConfigLock).toHaveBeenCalledTimes(1);
      expect(apiClient.serverConfig.bootstrapServerDzConfig).toHaveBeenCalledTimes(1);
      expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledTimes(1);
      expect(showToast.error).toHaveBeenCalledWith(
        'Configuration Invalid',
        '1 error(s) block saving. Line 1: Mission folder missing',
        undefined,
      );
    });

    const lockArgs = vi.mocked(apiClient.serverConfig.acquireConfigLock).mock.calls[0][1];
    expect(apiClient.serverConfig.releaseConfigLock).toHaveBeenCalledWith(SERVER_ID, {
      sessionToken: lockArgs.sessionToken,
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    expect(screen.getByText('serverDZ.cfg does not exist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create from template' })).toBeEnabled();
    expect(screen.queryByLabelText('serverDZ.cfg contents')).not.toBeInTheDocument();
  });

  it('notifies Save Failed without issuing a second save when overwrite reloads a null contentHash', async () => {
    vi.mocked(apiClient.serverConfig.getServerDzConfig)
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValueOnce(buildConfigResponse())
      .mockResolvedValueOnce(
        buildConfigResponse({
          exists: false,
          content: null,
          contentHash: null,
          projection: null,
        }),
      );
    vi.mocked(apiClient.serverConfig.saveServerDzConfig).mockRejectedValueOnce(
      makeApiError('CONFIG_HASH_MISMATCH', 409, 'Hash mismatch'),
    );

    renderCard(queryClient);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editor = await screen.findByLabelText('serverDZ.cfg contents');
    await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

    fireEvent.change(editor, { target: { value: `${VALID_CFG}\n// local change` } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('serverDZ.cfg changed on disk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));

    const overwriteDialog = await screen.findByRole('alertdialog');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(within(overwriteDialog).getByRole('button', { name: 'Overwrite' }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Save Failed',
        'serverDZ.cfg could not be reloaded from disk.',
        undefined,
      );
    });
    expect(apiClient.serverConfig.saveServerDzConfig).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('serverDZ.cfg changed on disk')).not.toBeInTheDocument();
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
  });

  describe('restoreConfigRevision failure paths', () => {
    async function enterEditAndOpenRestoreConfirmation(draftOverride?: string) {
      const rev1 = buildRevisionSummary({
        id: REV_1,
        source: 'editor',
        authorName: 'admin',
        createdAt: '2026-11-14T11:00:00.000Z',
      });
      vi.mocked(apiClient.serverConfig.listConfigRevisions).mockResolvedValue([rev1]);
      vi.mocked(apiClient.serverConfig.getConfigRevision).mockResolvedValue({
        ...rev1,
        content: `${VALID_CFG}\n// revision 1`,
      });

      renderCard(queryClient);
      fireEvent.click(await screen.findByRole('button', { name: 'History' }));
      fireEvent.click(await screen.findByRole('button', { name: /Saved in editor/i }));
      await screen.findByTestId('code-diff-view');

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      const editor = await screen.findByLabelText('serverDZ.cfg contents');
      await waitFor(() => expect(editor).not.toHaveAttribute('readonly'));

      if (draftOverride !== undefined) {
        fireEvent.change(editor, { target: { value: draftOverride } });
      }

      const restoreButton = screen.getByRole('button', { name: 'Restore' });
      await waitFor(() => expect(restoreButton).toBeEnabled());
      fireEvent.click(restoreButton);

      const restoreDialog = await screen.findByRole('alertdialog');
      return {
        editor,
        confirmRestore: () =>
          fireEvent.click(within(restoreDialog).getByRole('button', { name: 'Restore' })),
      };
    }

    it('triggers server validation diagnostics and error toast on 422 CONFIG_VALIDATION_FAILED', async () => {
      const serverDiag: ConfigDiagnosticDto = {
        severity: 'error',
        code: 'STEAM_QUERY_PORT_CONFLICT',
        message: 'steamQueryPort conflicts with gamePort.',
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 10,
      };
      vi.mocked(apiClient.serverConfig.restoreConfigRevision).mockRejectedValueOnce(
        makeApiError('CONFIG_VALIDATION_FAILED', 422, 'Validation error', {
          errorCount: 1,
          firstLine: 1,
          firstMessage: 'steamQueryPort conflicts with gamePort.',
        }),
      );
      vi.mocked(apiClient.serverConfig.validateServerDzConfig).mockResolvedValueOnce({
        valid: false,
        diagnostics: [serverDiag],
      });

      const { editor, confirmRestore } = await enterEditAndOpenRestoreConfirmation();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      confirmRestore();

      expect(await screen.findByText('Server validation')).toBeInTheDocument();
      expect(screen.getByText(/steamQueryPort conflicts with gamePort\./)).toBeInTheDocument();
      expect(apiClient.serverConfig.validateServerDzConfig).toHaveBeenCalledWith(SERVER_ID, {
        content: VALID_CFG,
      });
      expect(showToast.error).toHaveBeenCalledWith(
        'Configuration Invalid',
        '1 error(s) block saving. Line 1: steamQueryPort conflicts with gamePort.',
        undefined,
      );
      expect(editor).not.toHaveAttribute('readonly');
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    });

    it('notifies File Changed on Disk without offering draft Overwrite on 409 CONFIG_HASH_MISMATCH', async () => {
      vi.mocked(apiClient.serverConfig.restoreConfigRevision).mockRejectedValueOnce(
        makeApiError('CONFIG_HASH_MISMATCH', 409, 'Hash mismatch'),
      );

      const { editor, confirmRestore } = await enterEditAndOpenRestoreConfirmation();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      confirmRestore();

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith(
          'File Changed on Disk',
          'serverDZ.cfg was modified after it was loaded. Reload the file before writing again.',
          undefined,
        );
      });
      expect(screen.queryByText('serverDZ.cfg changed on disk')).not.toBeInTheDocument();
      expect(editor).not.toHaveAttribute('readonly');
      expect(screen.getByRole('button', { name: 'Restore' })).toBeEnabled();
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    });

    it('transitions to Edit lock lost read-only state and preserves draft on 409 CONFIG_LOCK_NOT_HELD', async () => {
      vi.mocked(apiClient.serverConfig.getServerDzConfig)
        .mockResolvedValueOnce(buildConfigResponse())
        .mockResolvedValueOnce(buildConfigResponse())
        .mockResolvedValueOnce(
          buildConfigResponse({
            lock: {
              holderUserId: 'usr-2',
              holderName: 'Alice',
              acquiredAt: '2026-11-14T12:20:00.000Z',
              expiresAt: '2026-11-14T12:25:00.000Z',
              heldByYou: false,
            },
          }),
        );
      vi.mocked(apiClient.serverConfig.restoreConfigRevision).mockRejectedValueOnce(
        makeApiError('CONFIG_LOCK_NOT_HELD', 409, 'Lock lost'),
      );

      const draftText = `${VALID_CFG}\n// unsaved draft before restore`;
      const { editor, confirmRestore } = await enterEditAndOpenRestoreConfirmation(draftText);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      confirmRestore();

      expect(await screen.findByText('Edit lock lost')).toBeInTheDocument();
      expect(screen.getByText(/Alice took over editing\./i)).toBeInTheDocument();
      expect(showToast.error).toHaveBeenCalledWith(
        'Edit Lock Lost',
        'This editor no longer holds the serverDZ.cfg edit lock. Your changes were not written.',
        undefined,
      );
      expect(editor).toHaveValue(draftText);
      expect(editor).toHaveAttribute('readonly');
      expect(screen.getByRole('button', { name: 'Restore' })).toBeDisabled();
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    });
  });

  describe('projection query cache synchronization on load', () => {
    it('invalidates server detail and list queries on initial load when cached ServerDetailDto has stale projection values', async () => {
      queryClient.setQueryData(
        serverQueryKeys.detail(SERVER_ID),
        buildServerDetail({
          queryPort: 27017,
          maxPlayers: 30,
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        }),
      );
      vi.mocked(apiClient.serverConfig.getServerDzConfig).mockResolvedValueOnce(
        buildConfigResponse({
          projection: {
            steamQueryPort: 2305,
            maxPlayers: 60,
            missionTemplate: 'dayzOffline.enoch',
          },
        }),
      );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderCard(queryClient);

      expect(await screen.findByLabelText('serverDZ.cfg contents')).toBeInTheDocument();
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      });
    });

    it('does not repeatedly invalidate server queries on re-render or lock-only refetch when contentHash and cached projection match', async () => {
      queryClient.setQueryData(
        serverQueryKeys.detail(SERVER_ID),
        buildServerDetail({
          queryPort: 2305,
          maxPlayers: 60,
          missionPath: 'mpmissions\\dayzOffline.enoch',
        }),
      );
      const syncedProjection = {
        steamQueryPort: 2305,
        maxPlayers: 60,
        missionTemplate: 'dayzOffline.enoch',
      };
      vi.mocked(apiClient.serverConfig.getServerDzConfig)
        .mockResolvedValueOnce(
          buildConfigResponse({
            contentHash: HASH_A,
            projection: syncedProjection,
            lock: null,
          }),
        )
        .mockResolvedValueOnce(
          buildConfigResponse({
            contentHash: HASH_A,
            projection: syncedProjection,
            lock: {
              holderUserId: 'usr-2',
              holderName: 'Alice',
              acquiredAt: '2026-11-14T12:15:00.000Z',
              expiresAt: '2026-11-14T12:20:00.000Z',
              heldByYou: false,
            },
          }),
        );

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { rerender } = renderCard(queryClient);

      expect(await screen.findByLabelText('serverDZ.cfg contents')).toBeInTheDocument();
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      });

      invalidateSpy.mockClear();

      rerender(
        <QueryClientProvider client={queryClient}>
          <ServerConfigCard
            serverId={SERVER_ID}
            serverName="DayZ Namalsk"
            isServerRunning={false}
          />
        </QueryClientProvider>,
      );

      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });

      await queryClient.refetchQueries({ queryKey: serverConfigQueryKeys.all });

      expect(await screen.findByText(/Being edited by Alice since/i)).toBeInTheDocument();
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
    });

    it('does not invalidate on re-render or lock-only refetch when only missionPath differs from projection.missionTemplate, while invalidating on maxPlayers mismatch', async () => {
      const syncQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 60_000 },
        },
      });
      syncQueryClient.setQueryData(
        serverQueryKeys.detail(SERVER_ID),
        buildServerDetail({
          queryPort: 2305,
          maxPlayers: 60,
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        }),
      );
      const driftedMissionProjection = {
        steamQueryPort: 2305,
        maxPlayers: 60,
        missionTemplate: 'dayzOffline.enoch',
      };
      vi.mocked(apiClient.serverConfig.getServerDzConfig)
        .mockResolvedValueOnce(
          buildConfigResponse({
            contentHash: HASH_A,
            projection: driftedMissionProjection,
            lock: null,
          }),
        )
        .mockResolvedValueOnce(
          buildConfigResponse({
            contentHash: HASH_A,
            projection: driftedMissionProjection,
            lock: {
              holderUserId: 'usr-2',
              holderName: 'Alice',
              acquiredAt: '2026-11-14T12:15:00.000Z',
              expiresAt: '2026-11-14T12:20:00.000Z',
              heldByYou: false,
            },
          }),
        )
        .mockResolvedValueOnce(
          buildConfigResponse({
            contentHash: HASH_A,
            projection: driftedMissionProjection,
            lock: null,
          }),
        );

      const invalidateSpy = vi.spyOn(syncQueryClient, 'invalidateQueries');
      const { rerender } = renderCard(syncQueryClient);

      expect(await screen.findByLabelText('serverDZ.cfg contents')).toBeInTheDocument();
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      });

      invalidateSpy.mockClear();

      rerender(
        <QueryClientProvider client={syncQueryClient}>
          <ServerConfigCard
            serverId={SERVER_ID}
            serverName="DayZ Namalsk"
            isServerRunning={false}
          />
        </QueryClientProvider>,
      );

      expect(syncQueryClient.getQueryData(serverQueryKeys.detail(SERVER_ID))).toBeDefined();
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });

      await syncQueryClient.refetchQueries({ queryKey: serverConfigQueryKeys.all });
      expect(await screen.findByText(/Being edited by Alice since/i)).toBeInTheDocument();
      expect(syncQueryClient.getQueryData(serverQueryKeys.detail(SERVER_ID))).toBeDefined();
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: serverQueryKeys.detail(SERVER_ID),
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });

      // Diverging maxPlayers on the same contentHash does trigger projection invalidation
      syncQueryClient.setQueryData(
        serverQueryKeys.detail(SERVER_ID),
        buildServerDetail({
          queryPort: 2305,
          maxPlayers: 50,
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        }),
      );
      await syncQueryClient.refetchQueries({ queryKey: serverConfigQueryKeys.all });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.detail(SERVER_ID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serverQueryKeys.list() });
      });
      syncQueryClient.clear();
    });
  });
});
