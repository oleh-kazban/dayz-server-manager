import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LaunchCommandDto } from '@aegis/api-contracts';

import { CompiledCommandPanel } from './CompiledCommandPanel';

const READY: LaunchCommandDto = {
  ready: true,
  executable: '/opt/dayz/DayZServer',
  cwd: '/opt/dayz',
  args: ['-config=serverDZ.cfg', '-mod=@CF', '-doLogs'],
  commandLine: '/opt/dayz/DayZServer -config=serverDZ.cfg -mod=@CF -doLogs',
  segments: [
    { arg: '-config=serverDZ.cfg', source: 'managed' },
    { arg: '-mod=@CF', source: 'mods' },
    { arg: '-doLogs', source: 'operator' },
  ],
  issues: [
    {
      severity: 'warning',
      code: 'LAUNCH_FILE_PATCHING_ENABLED',
      message: 'File patching warning',
      field: 'launchOptions.filePatching',
    },
  ],
};

describe('CompiledCommandPanel', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists the executable, labelled arguments, working directory and warnings', () => {
    render(<CompiledCommandPanel command={READY} isUnsaved={false} />);

    const region = screen.getByRole('region', { name: /Compiled launch command/i });
    expect(within(region).getByText('/opt/dayz/DayZServer')).toBeInTheDocument();
    const items = within(region).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual([
      'DSM-config=serverDZ.cfg',
      'Mods-mod=@CF',
      'Options-doLogs',
      'File patching warning',
    ]);
    expect(within(region).getByText('/opt/dayz')).toBeInTheDocument();
    expect(within(region).getByText('Review before launching')).toBeInTheDocument();
    expect(within(region).queryByText('Unsaved')).not.toBeInTheDocument();
  });

  it('marks an unsaved preview', () => {
    render(<CompiledCommandPanel command={{ ...READY, issues: [] }} isUnsaved />);
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    expect(screen.queryByText('Review before launching')).not.toBeInTheDocument();
  });

  it('copies the display command line and resets the confirmation', async () => {
    vi.useFakeTimers();
    const { unmount } = render(<CompiledCommandPanel command={READY} isUnsaved={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(writeText).toHaveBeenCalledWith(READY.commandLine);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    });
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    unmount();
  });

  it('shows blocking errors instead of a command when not ready', () => {
    render(
      <CompiledCommandPanel
        command={{
          ...READY,
          ready: false,
          args: [],
          segments: [],
          commandLine: '',
          issues: [
            {
              severity: 'error',
              code: 'LAUNCH_INSTALL_PATH_INVALID',
              message: 'Installation path must be absolute.',
              field: 'installPath',
            },
          ],
        }}
        isUnsaved={false}
      />,
    );

    expect(
      screen.getByText('The server cannot be launched with these settings'),
    ).toBeInTheDocument();
    expect(screen.getByText('Installation path must be absolute.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });
});
