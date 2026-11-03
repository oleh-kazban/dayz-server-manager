import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Server, User } from 'lucide-react';

import { StatusTag } from '../status-tag';

import { NotificationMenu } from './NotificationMenu';
import { type NotificationItem } from './NotificationMenu.types';

const meta: Meta<typeof NotificationMenu> = {
  title: 'Navigation/NotificationMenu',
  component: NotificationMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Server restarted',
    description: 'Chernarus Hardcore restarted successfully via scheduled task.',
    timestamp: '2m ago',
    severity: 'success',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'High memory usage',
    description: 'Server RAM exceeded 85% threshold (13.6 GB / 16 GB).',
    timestamp: '14m ago',
    severity: 'warning',
    read: false,
    actionLabel: 'Inspect Telemetry',
    onAction: item => alert(`Action: ${item.actionLabel}`),
  },
  {
    id: 'notif-3',
    title: 'BattlEye ban detected',
    description: 'Player "Survivor_88" was kicked and banned by BattlEye RCON.',
    timestamp: '1h ago',
    severity: 'danger',
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Mod update ready',
    description: 'DayZ-Expansion-Core v1.26 ready for staging deployment.',
    timestamp: '3h ago',
    severity: 'info',
    read: true,
  },
  {
    id: 'notif-5',
    title: 'Backup completed',
    description: 'Mission storage backup archive generated (4.2 MB).',
    timestamp: 'Yesterday',
    severity: 'success',
    read: true,
  },
];

export const Default: StoryObj<typeof NotificationMenu> = {
  render: () => {
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

    const handleMarkAllAsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleDismissItem = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleItemClick = (item: NotificationItem) => {
      setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
    };

    return (
      <div className="flex items-center justify-center p-12">
        <NotificationMenu
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDismissItem={handleDismissItem}
          onItemClick={handleItemClick}
          onViewAll={() => alert('Navigate to /audit/notifications')}
        />
      </div>
    );
  },
};

export const EmptyState: StoryObj<typeof NotificationMenu> = {
  render: () => (
    <div className="flex items-center justify-center p-12">
      <NotificationMenu
        notifications={[]}
        emptyText="No alerts pending"
        emptyDescription="All servers and background watchdogs are operating normally"
      />
    </div>
  ),
};

export const AllRead: StoryObj<typeof NotificationMenu> = {
  render: () => (
    <div className="flex items-center justify-center p-12">
      <NotificationMenu notifications={INITIAL_NOTIFICATIONS.map(n => ({ ...n, read: true }))} />
    </div>
  ),
};

export const InHeaderNavbarShowcase: StoryObj<typeof NotificationMenu> = {
  render: () => {
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

    return (
      <header className="w-full max-w-4xl flex items-center justify-between px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
        {/* Left: Server Status Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text-main)]">
                Chernarus Winter Hardcore
              </span>
              <StatusTag status="online">Online</StatusTag>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
              127.0.0.1:2302 · 48/60 Players
            </span>
          </div>
        </div>

        {/* Right: Actions and User */}
        <div className="flex items-center gap-2">
          <NotificationMenu
            notifications={notifications}
            onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onDismissItem={id => setNotifications(prev => prev.filter(n => n.id !== id))}
            onItemClick={item =>
              setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)))
            }
            onViewAll={() => alert('View all notifications')}
          />

          <div className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-secondary)]">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>
    );
  },
};
