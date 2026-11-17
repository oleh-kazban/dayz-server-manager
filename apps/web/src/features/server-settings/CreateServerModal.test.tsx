import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import { DEFAULT_LAUNCH_OPTIONS } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';
import { serverQueryKeys, UnsavedChangesScope } from '@aegis/web/core';

import { CreateServerModal } from './CreateServerModal';

const mockSetActiveServerId = vi.fn();

vi.mock('@aegis/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/web/core')>();
  return {
    ...actual,
    useActiveServer: () => ({
      servers: [],
      activeServer: null,
      activeServerId: null,
      setActiveServerId: mockSetActiveServerId,
      isLoading: false,
      error: null,
    }),
  };
});

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: {
        ...actual.apiClient.servers,
        create: vi.fn(),
      },
    },
  };
});

describe('CreateServerModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-success-id');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderModal = (isOpen = true) =>
    render(
      <QueryClientProvider client={queryClient}>
        <CreateServerModal isOpen={isOpen} onClose={mockOnClose} />
      </QueryClientProvider>,
    );

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container).toBeEmptyDOMElement();
  });

  const serverDetailDefaults = {
    maxPlayers: 60,
    rconIp: '127.0.0.1',
    rconPassword: 'secretpass' as string | null,
  };

  it('renders modal elements and handles form input modification and submission', async () => {
    vi.mocked(apiClient.servers.create).mockResolvedValue({
      id: 'srv-123',
      name: 'Namalsk Hardcore',
      description: 'Survival server',
      status: 'stopped',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      installPath: 'C:\\DayZ',
      profilePath: 'profiles',
      missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      launchOptions: DEFAULT_LAUNCH_OPTIONS,
      runtime: null,
      pendingStop: null,
      lastExit: null,
      isDefault: true,
      ...serverDetailDefaults,
      maxPlayers: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderModal(true);

    expect(screen.getByRole('heading', { name: 'Create DayZ Server' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Query Port/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Max Players/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Profile Path/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Mission Path/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Launch Parameters/i)).not.toBeInTheDocument();

    // Type into inputs
    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Namalsk Hardcore' },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Survival server' },
    });
    fireEvent.change(screen.getByLabelText(/^Game Port$/i), {
      target: { value: '2302' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Port/i), {
      target: { value: '2310' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Password/i), {
      target: { value: 'secretpass' },
    });
    fireEvent.change(screen.getByLabelText(/Installation Path/i), {
      target: { value: 'C:\\DayZ' },
    });

    // Toggle isDefault
    const defaultToggle = screen.getByLabelText(/Default Instance/i);
    fireEvent.click(defaultToggle);

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(apiClient.servers.create).toHaveBeenCalledWith({
        name: 'Namalsk Hardcore',
        description: 'Survival server',
        gamePort: 2302,
        rconPort: 2310,
        rconPassword: 'secretpass',
        installPath: 'C:\\DayZ',
        isDefault: true,
      });
      expect(showToast.success).toHaveBeenCalledWith(
        'Server Created',
        'Server "Namalsk Hardcore" has been created successfully.',
        undefined,
      );
      expect(mockSetActiveServerId).toHaveBeenCalledWith('srv-123');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates port range bounds, distinct game/RCON ports, short passwords, and required install path', async () => {
    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByLabelText(/Installation Path/i), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByLabelText(/^Game Port$/i), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Port/i), {
      target: { value: '70000' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Password/i), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    expect(screen.getByText('Installation path is required.')).toBeInTheDocument();
    expect(screen.getAllByText('Port must be between 1024 and 65535.')).toHaveLength(2);
    expect(
      screen.getByText('RCON password must be between 6 and 32 characters'),
    ).toBeInTheDocument();
    expect(showToast.error).not.toHaveBeenCalled();

    // Reject control characters in Server Name via serverNameSchema
    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Bad\0Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));
    expect(
      screen.getByText('Control characters (CR, LF, null bytes) are forbidden'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Test' },
    });

    // Type into gamePort to clear its error
    fireEvent.change(screen.getByLabelText(/^Game Port$/i), {
      target: { value: '2302' },
    });
    expect(screen.getAllByText('Port must be between 1024 and 65535.')).toHaveLength(1);

    // Set matching game and rcon ports to trigger distinct validation
    fireEvent.change(screen.getByLabelText(/RCON Port/i), {
      target: { value: '2302' },
    });
    fireEvent.change(screen.getByLabelText(/Installation Path/i), {
      target: { value: 'C:\\DayZ' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Password/i), {
      target: { value: 'validpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    expect(screen.getByText('Game port and RCON port must be distinct.')).toBeInTheDocument();
  });

  it('highlights all conflicting/invalid fields inline AND fires a red error toast for every API failure (REQ-03)', async () => {
    // 1. Simultaneous 409 conflicts on name, gamePort, and rconPort
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new ApiError('Server conflicts', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_NAME_CONFLICT',
        message: "Server with name 'Duplicate Server' already exists",
        params: { name: 'Duplicate Server' },
        fieldErrors: {
          name: {
            code: 'SERVER_NAME_CONFLICT',
            message: "Server with name 'Duplicate Server' already exists",
            params: { name: 'Duplicate Server' },
          },
          gamePort: {
            code: 'SERVER_PORT_COLLISION',
            message: 'Port 2302 collides',
            params: { port: 2302, occupiedBy: 'DayZ Local', occupiedById: 'srv-1' },
          },
          rconPort: {
            code: 'SERVER_PORT_COLLISION',
            message: 'Port 2310 collides',
            params: { port: 2310, occupiedBy: 'DayZ Local', occupiedById: 'srv-1' },
          },
        },
      }),
    );

    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Duplicate Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(
        screen.getByText('A server named "Duplicate Server" already exists.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Port 2302 is already in use by server "DayZ Local".'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Port 2310 is already in use by server "DayZ Local".'),
      ).toBeInTheDocument();
    });
    expect(showToast.error).toHaveBeenLastCalledWith(
      'Server Name Conflict',
      'A server named "Duplicate Server" already exists. Please choose a unique name.',
      undefined,
    );

    // 2. 400 VALIDATION_FAILED with structured fieldErrors -> inline + toast
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 400, {
        statusCode: 400,
        error: 'Bad Request',
        errorCode: 'VALIDATION_FAILED',
        message: 'Path traversal (..) is not permitted',
        fieldErrors: {
          installPath: {
            code: 'PATH_TRAVERSAL_FORBIDDEN',
            message: 'Path traversal (..) is not permitted',
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(screen.getByText('Path traversal (..) is not permitted.')).toBeInTheDocument();
    });
    expect(showToast.error).toHaveBeenLastCalledWith(
      'Validation Error',
      'Please review the highlighted fields and correct any invalid values.',
      undefined,
    );

    // 3. Non-field 500 server error -> toast only
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new ApiError('Internal error', 500, {
        statusCode: 500,
        error: 'Internal Server Error',
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Internal Server Error',
        'An unexpected error occurred on the server. Please try again.',
        undefined,
      );
    });
  });

  it('fires a toast when a 409 conflict targets a field the modal does not render (server-derived queryPort)', async () => {
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new ApiError('Port collision', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_PORT_COLLISION',
        message: "Port 27016 collides with existing server 'DayZ Local' (ID: srv-1)",
        params: { port: 27016, occupiedBy: 'DayZ Local', occupiedById: 'srv-1' },
        fieldErrors: {
          queryPort: {
            code: 'SERVER_PORT_COLLISION',
            message: "Port 27016 collides with existing server 'DayZ Local' (ID: srv-1)",
            params: { port: 27016, occupiedBy: 'DayZ Local', occupiedById: 'srv-1' },
          },
        },
      }),
    );

    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Second Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(showToast.error).mock.calls[0][1]).toMatch(/27016/);
    // Modal stays open so the user can adjust the input
    expect(screen.getByRole('button', { name: /^Create Server$/i })).toBeInTheDocument();
  });

  it('keeps Create Server enabled, focuses the first invalid field on submit, and re-validates live (DSM-00137)', () => {
    renderModal(true);
    const submit = screen.getByRole('button', { name: /^Create Server$/i });
    expect(submit).toBeEnabled();
    expect(submit).not.toHaveAttribute('aria-disabled');

    const nameInput = screen.getByLabelText(/Server Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();

    fireEvent.click(submit);
    expect(screen.getByText('Server name is required.')).toBeInTheDocument();
    expect(nameInput).toHaveFocus();
    expect(apiClient.servers.create).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: 'New Server' } });
    expect(screen.queryByText('Server name is required.')).not.toBeInTheDocument();
  });

  it('closes modal when Cancel button or X icon is clicked', () => {
    renderModal(true);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('closes modal on Escape key or backdrop click when not submitting (QA-02)', () => {
    renderModal(true);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole('dialog', { name: /Create DayZ Server/i });
    fireEvent.click(dialog);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('resets dirty form values and validation errors when closed and re-opened (QA-05)', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CreateServerModal isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>,
    );

    const nameInput = screen.getByLabelText(/Server Name/i);
    fireEvent.change(nameInput, { target: { value: 'Dirty Server Name' } });
    fireEvent.change(screen.getByLabelText(/Installation Path/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    expect(screen.getByText('Installation path is required.')).toBeInTheDocument();
    expect(nameInput).toHaveValue('Dirty Server Name');

    // Close modal
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateServerModal isOpen={false} onClose={mockOnClose} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open modal
    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateServerModal isOpen={true} onClose={mockOnClose} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/Server Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Installation Path/i)).toHaveValue('C:\\DayZServer');
    expect(screen.queryByText('Installation path is required.')).not.toBeInTheDocument();
  });

  it('ignores rapid duplicate submit clicks while create mutation is in flight (QA-01)', async () => {
    let resolveCreate!: (val: Awaited<ReturnType<typeof apiClient.servers.create>>) => void;
    vi.mocked(apiClient.servers.create).mockReturnValueOnce(
      new Promise(resolve => {
        resolveCreate = resolve;
      }),
    );

    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Single Flight Server' },
    });

    const submitBtn = screen.getByRole('button', { name: /^Create Server$/i });
    const form = submitBtn.closest('form')!;

    // Rapid synchronous double-submit
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(apiClient.servers.create).toHaveBeenCalledTimes(1);
    });

    resolveCreate({
      id: 'srv-999',
      name: 'Single Flight Server',
      description: null,
      status: 'stopped',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      installPath: 'C:\\DayZServer',
      profilePath: 'profiles',
      missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      launchOptions: DEFAULT_LAUNCH_OPTIONS,
      runtime: null,
      pendingStop: null,
      lastExit: null,
      isDefault: false,
      ...serverDetailDefaults,
      rconPassword: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('submits undefined rconPassword when password field is left blank', async () => {
    vi.mocked(apiClient.servers.create).mockResolvedValue({
      id: 'srv-minimal',
      name: 'Minimal Server',
      description: null,
      status: 'stopped',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      installPath: 'C:\\DayZServer',
      profilePath: 'profiles',
      missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      launchOptions: DEFAULT_LAUNCH_OPTIONS,
      runtime: null,
      pendingStop: null,
      lastExit: null,
      isDefault: false,
      ...serverDetailDefaults,
      rconPassword: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Minimal Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(apiClient.servers.create).toHaveBeenCalledWith({
        name: 'Minimal Server',
        description: undefined,
        gamePort: 2302,
        rconPort: 2310,
        rconPassword: undefined,
        installPath: 'C:\\DayZServer',
        isDefault: false,
      });
    });
  });

  describe('unsaved changes guard (DSM-00138)', () => {
    const renderGuarded = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <UnsavedChangesScope>
            <CreateServerModal isOpen onClose={mockOnClose} />
          </UnsavedChangesScope>
        </QueryClientProvider>,
      );
    const discardDialog = () =>
      screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });

    it('closes without asking while the form still holds its defaults', () => {
      renderGuarded();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('asks before discarding typed input and closes only after "Discard changes"', async () => {
      renderGuarded();
      fireEvent.change(screen.getByLabelText(/Server Name/i), { target: { value: 'Namalsk' } });

      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Keep editing' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Server Name/i)).toHaveValue('Namalsk');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(within(discardDialog()).getByRole('button', { name: 'Discard changes' }));
      await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1));
    });

    it('switches to the created server and closes without asking', async () => {
      vi.mocked(apiClient.servers.create).mockResolvedValue({
        id: 'srv-new',
        name: 'Namalsk',
        description: null,
        status: 'stopped',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        installPath: 'C:\\DayZServer',
        profilePath: 'profiles',
        missionPath: 'mpmissions\\dayzOffline.chernarusplus',
        launchOptions: DEFAULT_LAUNCH_OPTIONS,
        runtime: null,
        pendingStop: null,
        lastExit: null,
        isDefault: false,
        ...serverDetailDefaults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      renderGuarded();
      fireEvent.change(screen.getByLabelText(/Server Name/i), { target: { value: 'Namalsk' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Server' }));

      await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1));
      expect(mockSetActiveServerId).toHaveBeenCalledWith('srv-new');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      // The list cache knows the new server before the switch, so URL sync keeps it selected.
      expect(
        queryClient.getQueryData<{ id: string }[]>(serverQueryKeys.list())?.map(s => s.id),
      ).toContain('srv-new');
    });
  });
});
