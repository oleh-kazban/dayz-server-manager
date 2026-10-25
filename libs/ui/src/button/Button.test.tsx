import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowRight, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders with children text and default secondary variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('bg-[var(--color-surface)]');
  });

  it('renders primary and destructive variants', () => {
    const { rerender } = render(
      <Button variant="primary" destructive>
        Delete Server
      </Button>,
    );
    let button = screen.getByRole('button', { name: /delete server/i });
    expect(button.className).toContain('bg-[var(--color-status-danger)]');
    expect(button.className).toContain('text-white');

    rerender(<Button variant="primary">Save Changes</Button>);
    button = screen.getByRole('button', { name: /save changes/i });
    expect(button.className).toContain('bg-[var(--color-primary)]');
  });

  it('renders ghost and text variants', () => {
    const { rerender } = render(<Button variant="ghost">Ghost Button</Button>);
    let button = screen.getByRole('button', { name: /ghost button/i });
    expect(button.className).toContain('bg-transparent');

    rerender(
      <Button variant="text" destructive>
        Remove link
      </Button>,
    );
    button = screen.getByRole('button', { name: /remove link/i });
    expect(button.className).toContain('text-[var(--color-status-danger)]');
    expect(button.className).toContain('p-0');

    rerender(<Button variant="text">Plain text link</Button>);
    button = screen.getByRole('button', { name: /plain text link/i });
    expect(button.className).toContain('text-[var(--color-primary)]');
  });

  it('renders leading and trailing icons as component and as element', () => {
    render(
      <Button
        leftIcon={Trash2}
        rightIcon={<ArrowRight data-testid="custom-arrow" className="custom-icon" />}
      >
        Proceed
      </Button>,
    );

    expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    expect(screen.getByTestId('custom-arrow')).toBeInTheDocument();
  });

  it('handles loading state with spinner and disables button', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button isLoading leftIcon={Trash2} onClick={handleClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles icon-only detection when no children provided', () => {
    render(<Button leftIcon={Trash2} aria-label="Delete item" />);
    const button = screen.getByRole('button', { name: /delete item/i });

    expect(button.className).toContain('w-9');
  });

  it('supports explicit isIconOnly override and fullWidth', () => {
    render(
      <Button isIconOnly fullWidth aria-label="Expand action">
        Hidden Label
      </Button>,
    );
    const button = screen.getByRole('button', { name: /expand action/i });

    expect(button.className).toContain('w-full');
    expect(button.className).toContain('justify-center');
  });

  it('forwards React 19 native ref to button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Target</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('invokes onClick callback when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Trigger Action</Button>);
    await user.click(screen.getByRole('button', { name: /trigger action/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('prevents click events when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Disabled Action
      </Button>,
    );
    const button = screen.getByRole('button', { name: /disabled action/i });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
