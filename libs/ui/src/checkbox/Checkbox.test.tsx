import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label and description', () => {
    render(
      <Checkbox
        id="battleye-toggle"
        label="Enable BattlEye"
        description="Required for anti-cheat verification on dedicated servers"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /enable battleye/i });
    const description = screen.getByText(/required for anti-cheat verification/i);

    expect(checkbox).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(checkbox).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('battleye-toggle-description'),
    );
  });

  it('handles uncontrolled state with defaultChecked and fires onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Checkbox defaultChecked onChange={handleChange} label="Auto Restart" />);
    const checkbox = screen.getByRole('checkbox', { name: /auto restart/i });

    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('handles controlled checked state', () => {
    const { rerender } = render(<Checkbox checked={true} label="Controlled Checkbox" />);
    const checkbox = screen.getByRole('checkbox', { name: /controlled checkbox/i });
    expect(checkbox).toBeChecked();

    rerender(<Checkbox checked={false} label="Controlled Checkbox" />);
    expect(checkbox).not.toBeChecked();
  });

  it('supports indeterminate tri-state with aria-checked="mixed"', () => {
    const { rerender } = render(<Checkbox indeterminate label="Select All Mods" />);
    const checkbox = screen.getByRole('checkbox', { name: /select all mods/i });

    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    expect((checkbox as HTMLInputElement).indeterminate).toBe(true);

    rerender(<Checkbox indeterminate={false} label="Select All Mods" />);
    expect(checkbox).not.toHaveAttribute('aria-checked', 'mixed');
    expect((checkbox as HTMLInputElement).indeterminate).toBe(false);
  });

  it('renders validation error message and associates alert role', () => {
    render(
      <Checkbox
        id="terms-check"
        label="Accept Terms"
        error="You must accept the terms before proceeding"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /accept terms/i });
    const error = screen.getByRole('alert');

    expect(error).toHaveTextContent('You must accept the terms before proceeding');
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('terms-check-error'),
    );
  });

  it('forwards ref directly to native input', () => {
    const objectRef = createRef<HTMLInputElement>();
    const callbackRef = vi.fn();

    const { rerender } = render(<Checkbox ref={objectRef} label="Ref Checkbox" />);
    expect(objectRef.current).toBeInstanceOf(HTMLInputElement);

    rerender(<Checkbox ref={callbackRef} label="Callback Ref" />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('supports disabled state and triggers onFocus/onBlur callbacks', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    const { rerender } = render(<Checkbox label="Focus Test" onFocus={onFocus} onBlur={onBlur} />);
    const checkbox = screen.getByRole('checkbox', { name: /focus test/i });

    await user.click(checkbox);
    expect(onFocus).toHaveBeenCalled();

    await user.tab();
    expect(onBlur).toHaveBeenCalled();

    rerender(<Checkbox disabled label="Disabled Check" />);
    const disabledCheckbox = screen.getByRole('checkbox', { name: /disabled check/i });
    expect(disabledCheckbox).toBeDisabled();
  });
});
