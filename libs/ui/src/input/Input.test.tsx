import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders input with label and links id appropriately', () => {
    render(<Input label="Server Port" placeholder="2302" />);

    const label = screen.getByText('Server Port');
    const input = screen.getByPlaceholderText('2302');

    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input.id).toBeTruthy();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('renders validation error message and associates aria-describedby', () => {
    render(
      <Input id="port-field" label="Server Port" error="Port must be between 1024 and 65535" />,
    );

    const input = screen.getByLabelText('Server Port');
    const errorMessage = screen.getByText('Port must be between 1024 and 65535');

    expect(errorMessage).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'port-field-error');
    expect(errorMessage).toHaveAttribute('id', 'port-field-error');
  });

  it('renders leading icon and right action slot', () => {
    render(
      <Input
        leftIcon={Search}
        rightAction={<button type="button">Clear</button>}
        placeholder="Filter players..."
      />,
    );

    expect(screen.getByPlaceholderText('Filter players...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('delegates container click to focus input unless target is an action button', async () => {
    const user = userEvent.setup();
    const actionClick = vi.fn();

    const { container } = render(
      <Input
        label="Player Tag"
        placeholder="Enter tag"
        rightAction={
          <button type="button" onClick={actionClick}>
            Action
          </button>
        }
      />,
    );

    const input = screen.getByPlaceholderText('Enter tag');
    const containerDiv = container.querySelector('div.flex.items-center') as HTMLElement;
    const actionButton = screen.getByRole('button', { name: /action/i });

    expect(input).not.toHaveFocus();

    // Click container surface
    await user.click(containerDiv);
    expect(input).toHaveFocus();

    // Click inside action button does not re-delegate container focus
    await user.click(actionButton);
    expect(actionClick).toHaveBeenCalledTimes(1);
  });

  it('supports disabled state and prevents user input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Input disabled label="Disabled Field" placeholder="Cannot type" onChange={handleChange} />,
    );

    const input = screen.getByPlaceholderText('Cannot type');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');

    await user.type(input, 'test');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('supports containerClassName and customClassName', () => {
    const { container } = render(<Input containerClassName="col-span-2" placeholder="Custom" />);

    expect(container.firstChild).toHaveClass('col-span-2');
  });

  it('forwards ref via callback and object ref', () => {
    const objectRef = createRef<HTMLInputElement>();
    const callbackRef = vi.fn();

    const { rerender } = render(<Input ref={objectRef} placeholder="Object ref" />);
    expect(objectRef.current).toBeInstanceOf(HTMLInputElement);

    rerender(<Input ref={callbackRef} placeholder="Callback ref" />);
    expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });
});
