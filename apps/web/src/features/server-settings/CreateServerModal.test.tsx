import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@dsm/api-client';

import { CreateServerModal } from './CreateServerModal';

const mockSetActiveServerId = vi.fn();

vi.mock('@dsm/web/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dsm/web/core')>();
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

vi.mock('@dsm/api-client', () => ({
  apiClient: {
    servers: {
      create: vi.fn(),
    },
  },
}));

describe('CreateServerModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
      profilePath: 'C:\\DayZ\\profiles',
      missionPath: 'mpmissions\\namalsk',
      launchParameters: '-cpuCount=4',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderModal(true);

    expect(screen.getByRole('heading', { name: 'Create DayZ Server' })).toBeInTheDocument();

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
    fireEvent.change(screen.getByLabelText(/Query Port/i), {
      target: { value: '27016' },
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
    fireEvent.change(screen.getByLabelText(/Profile Path/i), {
      target: { value: 'C:\\DayZ\\profiles' },
    });
    fireEvent.change(screen.getByLabelText(/Mission Path/i), {
      target: { value: 'mpmissions\\namalsk' },
    });
    fireEvent.change(screen.getByLabelText(/Launch Parameters/i), {
      target: { value: '-cpuCount=4' },
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
        queryPort: 27016,
        rconPort: 2310,
        rconPassword: 'secretpass',
        installPath: 'C:\\DayZ',
        profilePath: 'C:\\DayZ\\profiles',
        missionPath: 'mpmissions\\namalsk',
        launchParameters: '-cpuCount=4',
        isDefault: true,
      });
      expect(mockSetActiveServerId).toHaveBeenCalledWith('srv-123');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates port range bounds, distinct port collisions, and short passwords', async () => {
    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Test' },
    });
    // Set invalid port < 1024 for queryPort
    fireEvent.change(screen.getByLabelText(/Query Port/i), {
      target: { value: '80' },
    });
    // Set matching game and rcon ports to trigger distinct validation
    fireEvent.change(screen.getByLabelText(/^Game Port$/i), {
      target: { value: '2302' },
    });
    fireEvent.change(screen.getByLabelText(/RCON Port/i), {
      target: { value: '2302' },
    });
    // Set short rcon password
    fireEvent.change(screen.getByLabelText(/RCON Password/i), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    expect(screen.getByText('Port must be between 1024 and 65535.')).toBeInTheDocument();
    expect(
      screen.getByText('Game port, query port, and RCON port must all be distinct.'),
    ).toBeInTheDocument();
    expect(screen.getByText('RCON password must be at least 6 characters.')).toBeInTheDocument();
  });

  it('handles backend conflict errors on name and port', async () => {
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new Error('A server with this name already exists'),
    );

    renderModal(true);

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Duplicate Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    // Test port collision rejection from backend
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(
      new Error('Port 2302 is already allocated'),
    );

    fireEvent.change(screen.getByLabelText(/Server Name/i), {
      target: { value: 'Valid Server' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Port 2302 is already allocated/i)).toBeInTheDocument();
    });

    // Test generic backend rejection
    vi.mocked(apiClient.servers.create).mockRejectedValueOnce(new Error('Database disk error'));

    fireEvent.click(screen.getByRole('button', { name: /^Create Server$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database disk error/i)).toBeInTheDocument();
    });
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
});
