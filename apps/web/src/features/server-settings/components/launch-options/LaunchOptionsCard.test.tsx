import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';
import { EMPTY_LAUNCH_OPTIONS, type LaunchCommandPreviewDto } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { type LaunchOptionsFormState, toLaunchOptionsFormState } from './launch-options.utils';
import { LaunchOptionsCard, type LaunchOptionsCardProps } from './LaunchOptionsCard';

vi.mock('@aegis/api-client', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/api-client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      servers: { ...actual.apiClient.servers, getLaunchCommand: vi.fn() },
    },
  };
});

const SERVER_ID = '55555555-5555-4555-a555-555555555555';

function context(overrides: Partial<LaunchCommandPreviewDto> = {}): LaunchCommandPreviewDto {
  return {
    serverId: SERVER_ID,
    platform: 'linux',
    mods: { modFolders: [], serverModFolders: ['@Admin'], missingFolderCount: 0 },
    command: {
      ready: true,
      executable: '',
      cwd: '',
      args: [],
      commandLine: '',
      segments: [],
      issues: [],
    },
    ...overrides,
  };
}

function Harness(props: Partial<LaunchOptionsCardProps>) {
  const [value, setValue] = useState<LaunchOptionsFormState>(
    toLaunchOptionsFormState(EMPTY_LAUNCH_OPTIONS),
  );
  return (
    <LaunchOptionsCard
      serverId={SERVER_ID}
      installPath="/opt/dayz"
      profilePath="profiles"
      gamePort={2302}
      value={value}
      onChange={setValue}
      errors={{}}
      disabled={false}
      hasUnsavedChanges={false}
      {...props}
    />
  );
}

function renderCard(props: Partial<LaunchOptionsCardProps> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

function renderedArgs(): (string | null | undefined)[] {
  const region = screen.getByRole('region', { name: /Compiled launch command/i });
  return within(within(region).getByRole('list', { name: 'Arguments' }))
    .getAllByRole('listitem')
    .map(item => item.querySelector('code')?.textContent);
}

describe('LaunchOptionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(showToast, 'error').mockReturnValue('toast-error-id');
  });

  it('shows a loading state, then compiles the preview live from the form values', async () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockResolvedValue(context());
    renderCard();

    expect(screen.getByLabelText('Loading compiled command')).toBeInTheDocument();
    await screen.findByRole('region', { name: /Compiled launch command/i });
    expect(apiClient.servers.getLaunchCommand).toHaveBeenCalledWith(SERVER_ID);
    expect(renderedArgs()).toEqual([
      '-config=serverDZ.cfg',
      '-port=2302',
      '-profiles=profiles',
      '-BEpath=profiles/BattlEye',
      '-serverMod=@Admin',
    ]);

    fireEvent.change(screen.getByLabelText(/CPU Count/i), { target: { value: '6' } });
    fireEvent.click(screen.getByLabelText(/Script debug/i));
    expect(renderedArgs()).toEqual([
      '-config=serverDZ.cfg',
      '-port=2302',
      '-profiles=profiles',
      '-BEpath=profiles/BattlEye',
      '-serverMod=@Admin',
      '-cpuCount=6',
      '-scriptDebug=true',
    ]);
    expect(screen.getByText(/Script debug adds diagnostic output/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/FPS Limit/i), { target: { value: '500' } });
    expect(
      screen.getByText('The server cannot be launched with these settings'),
    ).toBeInTheDocument();
  });

  it('renders inline field errors and disables every control while locked', async () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockResolvedValue(context());
    renderCard({
      disabled: true,
      errors: { 'launchOptions.cpuCount': 'CPU count must be between 1 and 64' },
    });

    expect(screen.getByText('CPU count must be between 1 and 64')).toBeInTheDocument();
    expect(screen.getByLabelText(/CPU Count/i)).toBeDisabled();
    expect(screen.getByLabelText(/FPS Limit/i)).toBeDisabled();
    expect(screen.getByLabelText(/File patching/i)).toBeDisabled();
    await screen.findByRole('region', { name: /Compiled launch command/i });
  });

  it('shows an inline notice without a toast when the launch context fails to load', async () => {
    vi.mocked(apiClient.servers.getLaunchCommand).mockRejectedValue(new Error('offline'));
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Compiled command unavailable')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('region', { name: /Compiled launch command/i }),
    ).not.toBeInTheDocument();
    expect(showToast.error).not.toHaveBeenCalled();
  });
});
