import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('supports functional callback ref', () => {
    const refCallback = vi.fn();
    render(<NotificationMenu ref={refCallback} notifications={sampleNotifications} />);

    expect(refCallback).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('closes dialog if component becomes disabled while open', () => {
    const { rerender } = render(<NotificationMenu notifications={sampleNotifications} />);

    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<NotificationMenu notifications={sampleNotifications} disabled />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies shadow-[var(--shadow-dropdown)] to dialog panel and focuses dialog on open', () => {
    render(<NotificationMenu notifications={sampleNotifications} />);

    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Notifications' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('shadow-[var(--shadow-dropdown)]');
    expect(dialog).toHaveFocus();
  });

  describe('unread bell animation', () => {
    const allReadNotifications: NotificationItem[] = sampleNotifications.map(item => ({
      ...item,
      read: true,
    }));

    it('animates icon wrapper and renders unread badge when unread notifications exist (REQ-01)', () => {
      render(<NotificationMenu notifications={sampleNotifications} />);

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;
      const bellSvg = trigger.querySelector('svg');

      expect(iconWrapper).toHaveClass('animate-bell-ring');
      expect(bellSvg).toHaveClass('overflow-visible');
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not animate icon wrapper when notifications list is empty or all notifications are read (REQ-01)', () => {
      const { rerender } = render(<NotificationMenu notifications={[]} />);

      const triggerEmpty = screen.getByRole('button', { name: /Notifications \(no unread\)/i });
      expect(triggerEmpty.firstElementChild).not.toHaveClass('animate-bell-ring');

      rerender(<NotificationMenu notifications={allReadNotifications} />);

      const triggerAllRead = screen.getByRole('button', { name: /Notifications \(no unread\)/i });
      expect(triggerAllRead.firstElementChild).not.toHaveClass('animate-bell-ring');
    });

    it('pauses animation when dialog opens and resumes with focus restored on Escape (REQ-02, REQ-06)', async () => {
      const user = userEvent.setup();
      render(<NotificationMenu notifications={sampleNotifications} />);

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;

      expect(iconWrapper).toHaveClass('animate-bell-ring');

      await user.click(trigger);

      expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(iconWrapper).toHaveClass('animate-bell-ring');
      expect(trigger).toHaveFocus();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('suppresses animation when disabled and toggles cleanly across disabled transitions (REQ-03, GUARD-01)', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <NotificationMenu notifications={sampleNotifications} disabled />,
      );

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;

      expect(trigger).toBeDisabled();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      await user.click(trigger);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<NotificationMenu notifications={sampleNotifications} disabled={false} />);
      expect(trigger).toBeEnabled();
      expect(iconWrapper).toHaveClass('animate-bell-ring');

      rerender(<NotificationMenu notifications={sampleNotifications} disabled />);
      expect(trigger).toBeDisabled();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      rerender(<NotificationMenu notifications={sampleNotifications} disabled={false} />);
      expect(trigger).toBeEnabled();
      expect(iconWrapper).toHaveClass('animate-bell-ring');
    });

    it('keeps animation suppressed if disabled becomes true while dialog is open (REQ-03, GUARD-01)', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NotificationMenu notifications={sampleNotifications} />);

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;

      await user.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');

      rerender(<NotificationMenu notifications={sampleNotifications} disabled />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(iconWrapper).not.toHaveClass('animate-bell-ring');
    });

    it('reacts to dynamic 0 -> 2 -> 0 unread transitions while preserving button DOM identity and focus (REQ-05, REQ-06)', () => {
      const { rerender } = render(<NotificationMenu notifications={allReadNotifications} />);

      const buttonBefore = screen.getByRole('button', { name: /Notifications \(no unread\)/i });
      const wrapperBefore = buttonBefore.firstElementChild as HTMLElement;
      buttonBefore.focus();

      expect(buttonBefore).toHaveFocus();
      expect(wrapperBefore).not.toHaveClass('animate-bell-ring');

      rerender(<NotificationMenu notifications={sampleNotifications} />);

      const buttonDuring = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      expect(buttonDuring).toBe(buttonBefore);
      expect(buttonDuring.firstElementChild).toBe(wrapperBefore);
      expect(buttonDuring).toHaveFocus();
      expect(wrapperBefore).toHaveClass('animate-bell-ring');
      expect(screen.getByText('2')).toBeInTheDocument();

      rerender(<NotificationMenu notifications={allReadNotifications} />);

      const buttonAfter = screen.getByRole('button', { name: /Notifications \(no unread\)/i });
      expect(buttonAfter).toBe(buttonBefore);
      expect(buttonAfter.firstElementChild).toBe(wrapperBefore);
      expect(buttonAfter).toHaveFocus();
      expect(wrapperBefore).not.toHaveClass('animate-bell-ring');
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });

    it('animates custom triggerIcon via wrapper span without mutating custom element props (Q2, REQ-06)', () => {
      const customIcon = (
        <span data-testid="custom-bell" className="custom-icon-class" data-custom="preserved">
          Alert
        </span>
      );

      const { rerender } = render(
        <NotificationMenu notifications={sampleNotifications} triggerIcon={customIcon} />,
      );

      const trigger = screen.getByRole('button', { name: /Notifications \(2 unread\)/i });
      const iconWrapper = trigger.firstElementChild as HTMLElement;
      const customElement = screen.getByTestId('custom-bell');

      expect(iconWrapper).toHaveClass('animate-bell-ring');
      expect(customElement).toHaveAttribute('class', 'custom-icon-class');
      expect(customElement).not.toHaveClass('animate-bell-ring');
      expect(customElement).toHaveAttribute('data-custom', 'preserved');

      rerender(<NotificationMenu notifications={allReadNotifications} triggerIcon={customIcon} />);

      expect(iconWrapper).not.toHaveClass('animate-bell-ring');
      expect(screen.getByTestId('custom-bell')).toHaveAttribute('class', 'custom-icon-class');
    });

    it('defines compositor-only bell-ring keyframes, burst-and-idle utility, and reduced-motion rule in keyframes.css (REQ-04, ARCH-01, ARCH-03)', () => {
      const keyframesPath = resolve(__dirname, '../styles/keyframes.css');
      const css = readFileSync(keyframesPath, 'utf8');

      const keyframesMatch = css.match(/@keyframes\s+bell-ring\s*\{([\s\S]*?)\n\}/);
      expect(keyframesMatch).not.toBeNull();

      const keyframesBody = keyframesMatch![1];
      expect(keyframesBody).toMatch(/0%,\s*14%,\s*100%\s*\{\s*transform:\s*rotate\(0deg\);/);
      expect(keyframesBody).toMatch(/transform:\s*rotate\(/);
      expect(keyframesBody).not.toMatch(
        /\b(width|height|top|left|right|bottom|margin|padding)\s*:/,
      );

      expect(css).toMatch(
        /\.animate-bell-ring\s*\{[^}]*transform-origin:\s*50%\s+15%;[^}]*animation:\s*bell-ring\s+6s\s+ease-in-out\s+infinite;/,
      );

      expect(css).toMatch(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.animate-bell-ring\s*\{\s*animation:\s*none;\s*\}\s*\}/,
      );
    });
  });
});
