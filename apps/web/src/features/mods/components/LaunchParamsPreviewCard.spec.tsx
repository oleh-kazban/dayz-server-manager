import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LaunchParamsPreviewCard } from './LaunchParamsPreviewCard';

describe('LaunchParamsPreviewCard', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it('renders compiled -mod= and -serverMod= flags and copies individual or combined flags', async () => {
    render(
      <LaunchParamsPreviewCard
        launchPreview={{
          modFlag: '-mod=@CF;@COT',
          serverModFlag: '-serverMod=@ServerTools',
          combinedArgs: ['-mod=@CF;@COT', '-serverMod=@ServerTools'],
          missingFolderCount: 0,
        }}
      />,
    );

    expect(screen.getByText('-mod=@CF;@COT')).toBeInTheDocument();
    expect(screen.getByText('-serverMod=@ServerTools')).toBeInTheDocument();
    expect(screen.queryByText('Mods Missing @Folder Name')).not.toBeInTheDocument();

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    expect(copyButtons).toHaveLength(2);

    fireEvent.click(copyButtons[0]);
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('-mod=@CF;@COT');
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy Combined Flags' }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('-mod=@CF;@COT -serverMod=@ServerTools');
      expect(screen.getByRole('button', { name: 'Copied All Flags' })).toBeInTheDocument();
    });
  });

  it('renders empty fallbacks and missing-folder warning notice when missingFolderCount > 0', () => {
    render(
      <LaunchParamsPreviewCard
        launchPreview={{
          modFlag: '',
          serverModFlag: '',
          combinedArgs: [],
          missingFolderCount: 2,
        }}
      />,
    );

    expect(screen.getByText('Mods Missing @Folder Name')).toBeInTheDocument();
    expect(screen.getByText(/2 enabled mod\(s\) do not have a configured/i)).toBeInTheDocument();
    expect(
      screen.getByText('No enabled client/server mods with a @folderName'),
    ).toBeInTheDocument();
    expect(screen.getByText('No enabled server-only mods with a @folderName')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy/i })).not.toBeInTheDocument();
  });

  it('keeps flag header rows min-h-9 aligned when serverModFlag is empty and avoids duplicate p-6 wrapper', () => {
    const { container } = render(
      <LaunchParamsPreviewCard
        launchPreview={{
          modFlag: '-mod=@CF',
          serverModFlag: '',
          combinedArgs: ['-mod=@CF'],
          missingFolderCount: 0,
        }}
      />,
    );

    const modHeaderRow = screen.getByText('Client & Server Mods (-mod=)').parentElement!;
    const serverModHeaderRow = screen.getByText('Server-Only Mods (-serverMod=)').parentElement!;

    expect(modHeaderRow).toHaveClass('min-h-9');
    expect(serverModHeaderRow).toHaveClass('min-h-9');

    const innerContent = container.querySelector('.space-y-4');
    expect(innerContent).not.toBeNull();
    expect(innerContent).not.toHaveClass('p-6');
  });
});
