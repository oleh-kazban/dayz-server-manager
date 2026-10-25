import { createRef } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renders trigger with placeholder when no value is selected', () => {
    render(<DatePicker placeholder="Select backup date" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /select date/i });
    expect(trigger).toHaveTextContent('Select backup date');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders formatted date when value is provided', () => {
    render(<DatePicker value="2025-10-25" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /select date/i });
    expect(trigger).toHaveTextContent(/oct 25, 2025/i);
  });

  it('toggles calendar popup on trigger click', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2025-10-25" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /select date/i });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /select date/i })).toBeInTheDocument();
  });

  it('clears selected date when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DatePicker value="2025-10-25" onChange={handleChange} />);

    const clearButton = screen.getByRole('button', { name: /clear date/i });
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith(undefined);
  });

  it('selects date in calendar and invokes onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DatePicker value="2025-10-25" onChange={handleChange} />);

    const trigger = screen.getByRole('button', { name: /select date/i });
    await user.click(trigger);

    const dayButton = screen.getByRole('button', { name: /october 20/i });
    await user.click(dayButton);

    expect(handleChange).toHaveBeenCalledWith('2025-10-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders validation error and links aria-describedby', () => {
    render(
      <DatePicker
        id="schedule-date"
        label="Maintenance Date"
        error="Date must be in the future"
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /select date/i });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', 'schedule-date-error');
    expect(screen.getByText('Date must be in the future')).toBeInTheDocument();
  });

  it('supports disabled state and suppresses popup', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DatePicker disabled onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /select date/i });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Close when becoming disabled while open
    rerender(<DatePicker onChange={vi.fn()} />);
    const activeTrigger = screen.getByRole('button', { name: /select date/i });
    await user.click(activeTrigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(<DatePicker disabled onChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles minDate and maxDate restrictions', () => {
    render(
      <DatePicker
        minDate="2025-10-01"
        maxDate="2025-10-31"
        value="2025-10-15"
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /select date/i });
    expect(trigger).toHaveTextContent(/oct 15, 2025/i);
  });

  it('handles native form invalid validation message', () => {
    const { container } = render(<DatePicker required onChange={vi.fn()} />);

    const hiddenInput = container.querySelector('input[type="date"]');
    expect(hiddenInput).toBeInTheDocument();

    if (hiddenInput) {
      fireEvent.invalid(hiddenInput);
    }

    expect(screen.getByText(/a date is required/i)).toBeInTheDocument();
  });

  it('forwards React 19 ref to trigger button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<DatePicker ref={ref} onChange={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
