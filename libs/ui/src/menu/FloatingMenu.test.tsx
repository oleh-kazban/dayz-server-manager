import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FloatingMenu, type FloatingMenuOption } from './FloatingMenu';

type ServerEnv = 'production' | 'staging' | 'test';

const options: FloatingMenuOption<ServerEnv>[] = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'test', label: 'Testing Environment' },
];

describe('FloatingMenu', () => {
  it('renders trigger button showing active selection and toggle state', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FloatingMenu
        options={options}
        value="production"
        onChange={handleChange}
        ariaLabel="Environment switcher"
      />,
    );

    const trigger = screen.getByRole('button', { name: /environment switcher/i });
    expect(trigger).toHaveTextContent('Production');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open dropdown
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: /environment switcher/i })).toBeInTheDocument();
  });

  it('selects option on click and invokes onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FloatingMenu
        options={options}
        value="production"
        onChange={handleChange}
        ariaLabel="Environment switcher"
      />,
    );

    await user.click(screen.getByRole('button', { name: /environment switcher/i }));
    const stagingOption = screen.getByRole('menuitemradio', { name: /staging/i });

    await user.click(stagingOption);
    expect(handleChange).toHaveBeenCalledWith('staging');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation via ArrowDown, ArrowUp, Home, End', async () => {
    const user = userEvent.setup();
    render(
      <FloatingMenu
        options={options}
        value="production"
        onChange={vi.fn()}
        ariaLabel="Environment switcher"
      />,
    );

    await user.click(screen.getByRole('button', { name: /environment switcher/i }));
    const items = screen.getAllByRole('menuitemradio');

    // Currently focused on index 0 (production)
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[2]).toHaveFocus();

    // Wrap around
    await user.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();

    // Arrow up wrap
    await user.keyboard('{ArrowUp}');
    expect(items[2]).toHaveFocus();

    // Home / End
    await user.keyboard('{Home}');
    expect(items[0]).toHaveFocus();

    await user.keyboard('{End}');
    expect(items[2]).toHaveFocus();
  });

  it('dismisses popup on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <FloatingMenu
        options={options}
        value="production"
        onChange={vi.fn()}
        ariaLabel="Environment switcher"
      />,
    );

    const trigger = screen.getByRole('button', { name: /environment switcher/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('supports disabled state', async () => {
    const user = userEvent.setup();
    render(
      <FloatingMenu
        disabled
        options={options}
        value="production"
        onChange={vi.fn()}
        ariaLabel="Disabled Menu"
      />,
    );

    const trigger = screen.getByRole('button', { name: /disabled menu/i });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('forwards React 19 ref to trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <FloatingMenu
        ref={ref}
        options={options}
        value="production"
        onChange={vi.fn()}
        ariaLabel="Ref Menu"
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
