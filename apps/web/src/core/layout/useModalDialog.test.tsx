import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModalDialog } from './useModalDialog';

function TestModal({
  onClose,
  isBusy = false,
  renderFocusable = true,
}: {
  onClose: () => void;
  isBusy?: boolean;
  renderFocusable?: boolean;
}) {
  const { dialogRef, handleBackdropClick } = useModalDialog({ onClose, isBusy });

  return (
    <div data-testid="backdrop" onClick={handleBackdropClick}>
      <div ref={dialogRef} data-testid="dialog-card">
        {renderFocusable ? (
          <>
            <button type="button" data-testid="first-btn">
              First
            </button>
            <input type="text" data-testid="mid-input" />
            <button type="button" data-testid="last-btn">
              Last
            </button>
            <button type="button" hidden data-testid="hidden-btn">
              Hidden
            </button>
            <button type="button" aria-hidden="true" data-testid="aria-hidden-btn">
              Aria Hidden
            </button>
          </>
        ) : (
          <p>No focusable controls</p>
        )}
      </div>
    </div>
  );
}

describe('useModalDialog', () => {
  it('locks body overflow on mount and restores overflow and previous focus on unmount', () => {
    const triggerButton = document.createElement('button');
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    document.body.style.overflow = 'auto';
    const onClose = vi.fn();

    const { unmount } = render(<TestModal onClose={onClose} />);
    expect(document.body.style.overflow).toBe('hidden');

    screen.getByTestId('first-btn').focus();
    expect(document.activeElement).toBe(screen.getByTestId('first-btn'));

    unmount();

    expect(document.body.style.overflow).toBe('auto');
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(triggerButton);
  });

  it('calls onClose on Escape key when isBusy is false and ignores Escape when isBusy is true', () => {
    const onClose = vi.fn();
    const { rerender } = render(<TestModal onClose={onClose} isBusy={false} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<TestModal onClose={onClose} isBusy={true} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on backdrop click when isBusy is false, and ignores inner clicks or backdrop clicks when isBusy is true', () => {
    const onClose = vi.fn();
    const { rerender } = render(<TestModal onClose={onClose} isBusy={false} />);

    // Click inside dialog card should not close
    fireEvent.click(screen.getByTestId('dialog-card'));
    expect(onClose).not.toHaveBeenCalled();

    // Direct backdrop click should close
    fireEvent.click(screen.getByTestId('backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click while busy should be ignored
    rerender(<TestModal onClose={onClose} isBusy={true} />);
    fireEvent.click(screen.getByTestId('backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab and Shift+Tab focus within focusable dialog elements', () => {
    const onClose = vi.fn();
    render(<TestModal onClose={onClose} />);

    const firstBtn = screen.getByTestId('first-btn');
    const midInput = screen.getByTestId('mid-input');
    const lastBtn = screen.getByTestId('last-btn');

    // When focus is outside dialog, Tab moves focus to first element
    document.body.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);

    // When focus is on first element, Shift+Tab wraps to last element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);

    // When focus is on last element, Tab wraps to first element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);

    // When focus is on middle element, Tab/Shift+Tab does not intercept default browser focus progression
    midInput.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(shiftTabEvent);
    expect(shiftTabEvent.defaultPrevented).toBe(false);
  });

  it('prevents default Tab behavior when dialog has zero focusable elements', () => {
    const onClose = vi.fn();
    render(<TestModal onClose={onClose} renderFocusable={false} />);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
  });
});
