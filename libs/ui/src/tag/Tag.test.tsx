import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check, Tag as TagIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Tag } from './Tag';

describe('Tag', () => {
  it('renders content with default subtle variant and default color', () => {
    render(<Tag>Chernarus</Tag>);

    const tag = screen.getByText('Chernarus');
    expect(tag).toBeInTheDocument();
    expect(tag.parentElement?.className).toContain('bg-[var(--color-surface-subtle)]');
  });

  it('supports solid, outline, and neutral variants', () => {
    const { rerender } = render(
      <Tag variant="solid" color="primary">
        Livonia
      </Tag>,
    );
    let badge = screen.getByText('Livonia').parentElement;
    expect(badge?.className).toContain('bg-[var(--color-primary)]');
    expect(badge?.className).toContain('text-white');

    rerender(
      <Tag variant="outline" color="danger">
        Hardcore
      </Tag>,
    );
    badge = screen.getByText('Hardcore').parentElement;
    expect(badge?.className).toContain('border-[var(--color-status-danger)]');
    expect(badge?.className).toContain('bg-transparent');

    rerender(<Tag variant="neutral">Neutral Tag</Tag>);
    badge = screen.getByText('Neutral Tag').parentElement;
    expect(badge?.className).toContain('border-[var(--color-border)]');
  });

  it('renders pill shape and typography modifiers', () => {
    render(
      <Tag shape="pill" uppercase mono>
        v1.26
      </Tag>,
    );

    const badge = screen.getByText('v1.26').parentElement;
    expect(badge?.className).toContain('rounded-full');
    expect(badge?.className).toContain('uppercase');
    expect(badge?.className).toContain('font-mono');
  });

  it('renders leading and trailing icons as component and ReactNode', () => {
    render(
      <Tag leftIcon={TagIcon} rightIcon={<Check data-testid="check-icon" />}>
        Verified
      </Tag>,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('handles remove/dismiss action when onRemove is provided', async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(
      <Tag onRemove={handleRemove} removeAriaLabel="Remove Livonia tag">
        Livonia
      </Tag>,
    );

    const removeButton = screen.getByRole('button', { name: /remove livonia tag/i });
    expect(removeButton).toBeInTheDocument();

    await user.click(removeButton);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('disables tag and suppress remove clicks when disabled is true', async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(
      <Tag disabled onRemove={handleRemove}>
        Locked Mod
      </Tag>,
    );

    const removeButton = screen.getByRole('button', { name: /remove tag/i });
    expect(removeButton).toBeDisabled();

    await user.click(removeButton);
    expect(handleRemove).not.toHaveBeenCalled();
  });

  it('forwards React 19 ref to root span badge', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Tag ref={ref}>Ref Badge</Tag>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
