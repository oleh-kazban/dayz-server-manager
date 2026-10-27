import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { DotsFloatingMenu } from './DotsFloatingMenu';
import type { DotsFloatingMenuOption } from './FloatingMenu.types';

describe('DotsFloatingMenu', () => {
  it('renders trigger button and opens menu with options', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const options: DotsFloatingMenuOption[] = [
      { label: 'Edit Profile', onSelect: handleEdit },
      { label: 'Delete Instance', onSelect: handleDelete, destructive: true },
    ];

    render(<DotsFloatingMenu options={options} ariaLabel="Server actions" />);

    const trigger = screen.getByRole('button', { name: /server actions/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole('menu', { name: /server actions/i })).toBeInTheDocument();

    const deleteOption = screen.getByRole('menuitem', { name: /delete instance/i });
    expect(deleteOption.className).toContain('text-[var(--color-status-danger)]');

    await user.click(deleteOption);
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('skips disabled options during keyboard navigation and prevents their selection', async () => {
    const user = userEvent.setup();
    const handleRestart = vi.fn();
    const handleWipe = vi.fn();

    const options: DotsFloatingMenuOption[] = [
      { label: 'Restart', onSelect: handleRestart },
      { label: 'Wipe (Disabled)', onSelect: handleWipe, disabled: true },
      { label: 'View Logs', onSelect: vi.fn() },
    ];

    render(<DotsFloatingMenu options={options} ariaLabel="Actions" />);

    const trigger = screen.getByRole('button', { name: /actions/i });
    await user.click(trigger);

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems[0]).toHaveFocus();

    // Arrow down skips disabled index 1 to focus index 2
    await user.keyboard('{ArrowDown}');
    expect(menuItems[2]).toHaveFocus();

    // Arrow up wraps back to index 0
    await user.keyboard('{ArrowUp}');
    expect(menuItems[0]).toHaveFocus();

    // End navigates to last enabled item
    await user.keyboard('{End}');
    expect(menuItems[2]).toHaveFocus();

    // Home navigates to first enabled item
    await user.keyboard('{Home}');
    expect(menuItems[0]).toHaveFocus();

    // Clicking disabled option does nothing
    await user.click(menuItems[1]);
    expect(handleWipe).not.toHaveBeenCalled();
  });

  it('closes menu if component becomes disabled while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DotsFloatingMenu options={[{ label: 'Action', onSelect: vi.fn() }]} ariaLabel="Actions" />,
    );

    await user.click(screen.getByRole('button', { name: /actions/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    rerender(
      <DotsFloatingMenu
        disabled
        options={[{ label: 'Action', onSelect: vi.fn() }]}
        ariaLabel="Actions"
      />,
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports custom trigger icon and ref forwarding', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <DotsFloatingMenu
        ref={ref}
        icon={<Settings data-testid="settings-icon" />}
        options={[{ label: 'Settings', onSelect: vi.fn() }]}
        ariaLabel="Settings menu"
      />,
    );

    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
