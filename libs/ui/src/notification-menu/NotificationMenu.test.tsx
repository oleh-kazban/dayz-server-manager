import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationMenu } from './NotificationMenu';
import { type NotificationItem } from './NotificationMenu.types';

const sampleNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Server restarted',
    description: 'Chernarus Hardcore restarted successfully via scheduled task.',
    timestamp: '5m ago',
    severity: 'success',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'High memory usage',
    description: 'Server RAM exceeded 85% utilization.',
    timestamp: '15m ago',
    severity: 'warning',
    read: false,
    actionLabel: 'View Metrics',
    onAction: vi.fn(),
  },
  {
    id: 'notif-3',
    title: 'Mod update available',
    description: 'Expansion Mod v1.26 ready to install.',
    timestamp: '1h ago',
    severity: 'info',
    read: true,
  },
];

describe('NotificationMenu', () => {
  it('renders trigger button with unread count badge and accessible label', () => {
    render(<NotificationMenu notifications={sampleNotifications} />);

    const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
    expect(trigger).toBeInTheDocument();

    // Badge showing '2'
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders 99+ when unread notifications exceed 99', () => {
    const manyUnread: NotificationItem[] = Array.from({ length: 105 }, (_, i) => ({
      id: `id-${i}`,
      title: `Event ${i}`,
      timestamp: 'now',
      read: false,
    }));

    render(<NotificationMenu notifications={manyUnread} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('opens dialog popover on trigger click and renders items', () => {
    render(<NotificationMenu notifications={sampleNotifications} />);

    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Server restarted')).toBeInTheDocument();
    expect(screen.getByText('High memory usage')).toBeInTheDocument();
    expect(screen.getByText('Mod update available')).toBeInTheDocument();
  });

  it('triggers onItemClick when clicking an item row', () => {
    const onItemClick = vi.fn();
    render(<NotificationMenu notifications={sampleNotifications} onItemClick={onItemClick} />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const itemRow = screen.getByText('Server restarted').closest('button')!;
    fireEvent.click(itemRow);

    expect(onItemClick).toHaveBeenCalledWith(sampleNotifications[0]);
  });

  it('triggers onAction callback without propagating to onItemClick', () => {
    const onItemClick = vi.fn();
    const actionCallback = vi.fn();
    const items: NotificationItem[] = [
      {
        id: 'act-1',
        title: 'Action Item',
        timestamp: 'now',
        actionLabel: 'Inspect',
        onAction: actionCallback,
      },
    ];

    render(<NotificationMenu notifications={items} onItemClick={onItemClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const actionButton = screen.getByRole('button', { name: /Inspect/i });
    fireEvent.click(actionButton);

    expect(actionCallback).toHaveBeenCalledWith(items[0]);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('triggers onDismissItem without propagating to onItemClick', () => {
    const onItemClick = vi.fn();
    const onDismissItem = vi.fn();

    render(
      <NotificationMenu
        notifications={sampleNotifications}
        onItemClick={onItemClick}
        onDismissItem={onDismissItem}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const dismissButton = screen.getByRole('button', {
      name: `Dismiss notification: ${sampleNotifications[0].title}`,
    });
    fireEvent.click(dismissButton);

    expect(onDismissItem).toHaveBeenCalledWith(sampleNotifications[0].id);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('triggers onMarkAllAsRead when Mark all as read button is clicked', () => {
    const onMarkAllAsRead = vi.fn();
    render(
      <NotificationMenu notifications={sampleNotifications} onMarkAllAsRead={onMarkAllAsRead} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const markAllButton = screen.getByRole('button', { name: /Mark all as read/i });
    fireEvent.click(markAllButton);

    expect(onMarkAllAsRead).toHaveBeenCalled();
  });

  it('renders empty state when there are no notifications', () => {
    render(
      <NotificationMenu
        notifications={[]}
        emptyText="All quiet on the front"
        emptyDescription="No server alerts recorded"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    expect(screen.getByText('All quiet on the front')).toBeInTheDocument();
    expect(screen.getByText('No server alerts recorded')).toBeInTheDocument();
  });

  it('triggers onViewAll when clicking footer action', () => {
    const onViewAll = vi.fn();
    render(
      <NotificationMenu
        notifications={sampleNotifications}
        onViewAll={onViewAll}
        viewAllLabel="See complete log"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const footerButton = screen.getByRole('button', { name: /See complete log/i });
    fireEvent.click(footerButton);

    expect(onViewAll).toHaveBeenCalled();
  });

  it('closes dialog on Escape key', () => {
    render(<NotificationMenu notifications={sampleNotifications} />);

    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables trigger when disabled prop is true', () => {
    render(<NotificationMenu notifications={sampleNotifications} disabled />);

    const trigger = screen.getByRole('button', { name: /Notifications/i });
    expect(trigger).toBeDisabled();

    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('forwards native button ref correctly', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<NotificationMenu ref={ref} notifications={sampleNotifications} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
