import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NO_CHANGES_HINT, SaveButton } from './SaveButton';

describe('SaveButton', () => {
  it('is aria-disabled, focusable and inert while unchanged, with a "No changes to save" tooltip', () => {
    const onClick = vi.fn();
    render(
      <SaveButton hasChanges={false} isPending={false} onClick={onClick}>
        Save
      </SaveButton>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    act(() => {
      button.focus();
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent(NO_CHANGES_HINT);
  });

  it('prevents form submission while unchanged', () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <SaveButton type="submit" hasChanges={false} isPending={false}>
          Save
        </SaveButton>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is active with changes and shows the loading state while pending', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SaveButton hasChanges isPending={false} onClick={onClick}>
        Save
      </SaveButton>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).not.toHaveAttribute('aria-disabled');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <SaveButton hasChanges isPending onClick={onClick}>
        Save
      </SaveButton>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  });
});
