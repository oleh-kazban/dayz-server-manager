import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient, ApiError } from '@aegis/api-client';
import type { ServerModDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { EditModModal } from './EditModModal';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      mods: {
        ...actual.apiClient.mods,
        update: vi.fn(),
      },
    },
  };
});

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const sampleMod: ServerModDto = {
  id: '22222222-2222-4222-8222-222222222222',
  serverId: SERVER_ID,
  sourceType: 'workshop',
  loadTarget: 'client_server',
  workshopId: '1559212036',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
  folderName: '@CF',
  name: 'CF',
  sizeBytes: 1024,
  remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
  syncedWorkshopUpdatedAt: '2026-11-10T10:00:00.000Z',
  lastSyncedAt: '2026-11-10T10:00:00.000Z',
  syncStatus: 'up_to_date',
  enabled: true,
  loadOrder: 0,
  createdAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
};

describe('EditModModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'success').mockReturnValue('toast-ok');
    vi.spyOn(showToast, 'error').mockReturnValue('toast-err');
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof EditModModal>> = {}) =>
    render(
      <QueryClientProvider client={queryClient}>
        <EditModModal
          isOpen
          mod={sampleMod}
          serverId={SERVER_ID}
          isServerLocked={false}
          onClose={mockOnClose}
          {...props}
        />
      </QueryClientProvider>,
    );

  it('renders nothing when closed or mod is null', () => {
    const { container: closed } = renderModal({ isOpen: false });
    expect(closed).toBeEmptyDOMElement();

    const { container: noMod } = renderModal({ mod: null });
    expect(noMod).toBeEmptyDOMElement();
  });

  it('validates mod name and @folderName format client-side before calling API', () => {
    renderModal();

    const nameInput = screen.getByLabelText('Mod Name');
    const folderInput = screen.getByLabelText('@Folder Name');

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.change(folderInput, { target: { value: 'CF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByText('Mod name is required.')).toBeInTheDocument();
    expect(
      screen.getByText('Mod folder name must start with @ and include at least one character.'),
    ).toBeInTheDocument();

    fireEvent.change(folderInput, { target: { value: '@CF;bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText('Mod folder name contains forbidden characters.')).toBeInTheDocument();

    expect(apiClient.mods.update).not.toHaveBeenCalled();
  });

  it('submits updated mod configuration, switches loadTarget, and closes on success', async () => {
    vi.mocked(apiClient.mods.update).mockResolvedValueOnce({
      ...sampleMod,
      name: 'CF Renamed',
      folderName: '@CF_New',
      loadTarget: 'server_only',
    });

    renderModal();

    fireEvent.change(screen.getByLabelText('Mod Name'), { target: { value: '  CF Renamed  ' } });
    fireEvent.change(screen.getByLabelText('@Folder Name'), { target: { value: '  @CF_New  ' } });
    fireEvent.click(screen.getByLabelText('Load Target'));
    fireEvent.click(await screen.findByRole('option', { name: /Server Only/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(apiClient.mods.update).toHaveBeenCalledWith(SERVER_ID, sampleMod.id, {
        name: 'CF Renamed',
        folderName: '@CF_New',
        loadTarget: 'server_only',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });

    expect(showToast.success).toHaveBeenCalled();
  });

  it('maps server ApiError fieldErrors onto folderName input and respects isServerLocked', async () => {
    vi.mocked(apiClient.mods.update).mockRejectedValueOnce(
      new ApiError('Conflict', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'MOD_ALREADY_INSTALLED',
        message: 'Folder already exists',
        fieldErrors: {
          folderName: {
            code: 'INVALID_VALUE',
            message: 'Folder "@Other" is already in use.',
          },
        },
      }),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText('@Folder Name'), { target: { value: '@Other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Folder "@Other" is already in use.')).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();

    const { unmount } = renderModal({ isServerLocked: true });
    const saveButtons = screen.getAllByRole('button', { name: 'Save Changes' });
    expect(saveButtons[saveButtons.length - 1]).toBeDisabled();
    unmount();
  });
});
