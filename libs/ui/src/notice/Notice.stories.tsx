import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Database, RefreshCw, Terminal } from 'lucide-react';

import { Button } from '../button';

import { Notice } from './Notice';

const meta: Meta<typeof Notice> = {
  title: 'Feedback/Notice',
  component: Notice,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Notice>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Experimental Update Available',
    children:
      'DayZ dedicated server version 1.26.159040 is available on SteamCMD branch public. Your current version is 1.25.158593.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Automated Restart Scheduled',
    children:
      'Server maintenance cycle begins in 10 minutes. BattlEye RCON shutdown sequence will notify connected players before persistence flush.',
  },
};

export const ErrorNotice: Story = {
  args: {
    variant: 'error',
    title: 'Central Economy Schema Validation Error',
    children:
      'types.xml parsing failed: unclosed XML tag at line 1242 for item class "M4A1_Green". Economy loading aborted to prevent item wipes.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Persistence Backup Completed',
    children:
      'SQLite WAL micro-batching verified. Backup archive "dayz_backup_20261026_1600.tar.gz" verified against SHA-256 checksum.',
  },
};

export const WithAction: Story = {
  render: () => (
    <Notice
      variant="warning"
      title="RCON Connection Dropped"
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-7 px-2.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reconnect Socket
          </Button>
          <Button variant="ghost" className="h-7 px-2 text-xs">
            Inspect Logs
          </Button>
        </div>
      }
    >
      BattlEye server socket on port 2302 timed out after 3 consecutive keep-alive probes. Admin
      commands are paused.
    </Notice>
  ),
};

export const Dismissible: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);

    if (!visible) {
      return (
        <Button variant="secondary" onClick={() => setVisible(true)}>
          Show Notice Again
        </Button>
      );
    }

    return (
      <Notice variant="info" title="Storage Volume Optimization" onClose={() => setVisible(false)}>
        NVMe log volume has 42 GB available. Older crash dumps and RPT logs have been queued for
        daily compression.
      </Notice>
    );
  },
};

export const CustomIcon: Story = {
  args: {
    variant: 'info',
    icon: Database,
    title: 'Drizzle ORM WAL Checkpoint',
    children:
      'SQLite database journal executed PASSIVE checkpoint. 142 WAL frames merged into manager.sqlite.',
  },
};

export const WithoutIcon: Story = {
  args: {
    variant: 'info',
    icon: false,
    title: 'Console Notice',
    children: 'Plain notice banner rendered without any leading iconography.',
  },
};

export const LongFormContent: Story = {
  args: {
    variant: 'error',
    icon: Terminal,
    title: 'Process Signal SIGSEGV in DayZServer_x64',
    children: (
      <div className="space-y-1.5">
        <p>
          Process terminated abruptly with exit code 139. Stack trace indicates fault inside
          VPPAdminTools.dll.
        </p>
        <pre className="p-2 rounded bg-[var(--color-surface)]/80 text-[11px] font-mono border border-[var(--color-border)]/50 overflow-x-auto">
          0x00007FF72F9A1B20: DayZServer_x64.exe + 0x14A20 (Crash dump written to
          /crashdumps/dump_20261026.dmp)
        </pre>
      </div>
    ),
  },
};
