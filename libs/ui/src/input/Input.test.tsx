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

  it('merges external aria-describedby with error message id', () => {
    render(
      <Input
        id="port-input"
        label="Server Port"
        aria-describedby="port-hint"
        error="Port must be between 1024 and 65535"
      />,
    );

    const input = screen.getByLabelText('Server Port');
    expect(input).toHaveAttribute('aria-describedby', 'port-hint port-input-error');
  });

  it('renders error message with role="alert"', () => {
    render(<Input label="Server Port" error="Invalid port" />);

    const alertMessage = screen.getByRole('alert');
    expect(alertMessage).toBeInTheDocument();
    expect(alertMessage).toHaveTextContent('Invalid port');
  });

  it('preserves external aria-describedby when no error is present', () => {
    render(<Input label="Server Port" aria-describedby="port-hint" />);

    const input = screen.getByLabelText('Server Port');
    expect(input).toHaveAttribute('aria-describedby', 'port-hint');
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

  it('focuses input directly when clicked', async () => {
    const user = userEvent.setup();
    render(<Input label="Player Tag" placeholder="Enter tag" />);

    const input = screen.getByPlaceholderText('Enter tag');
    expect(input).not.toHaveFocus();

    await user.click(input);
    expect(input).toHaveFocus();
  });

  it('focuses input when label is clicked', async () => {
    const user = userEvent.setup();
    render(<Input label="Player Tag" placeholder="Enter tag" />);

    const label = screen.getByText('Player Tag');
    const input = screen.getByPlaceholderText('Enter tag');

    expect(input).not.toHaveFocus();
    await user.click(label);
    expect(input).toHaveFocus();
  });

  it('fires click handler when rightAction button is clicked', async () => {
    const user = userEvent.setup();
    const handleActionClick = vi.fn();

    render(
      <Input
        label="Player Tag"
        placeholder="Enter tag"
        rightAction={
          <button type="button" onClick={handleActionClick}>
            Action
          </button>
        }
      />,
    );

    const actionButton = screen.getByRole('button', { name: /action/i });
    await user.click(actionButton);
    expect(handleActionClick).toHaveBeenCalledTimes(1);
  });

  it('applies pointer-events-none and aria-hidden to LeftIcon', () => {
    const { container } = render(<Input leftIcon={Search} placeholder="Search" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('pointer-events-none');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
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
