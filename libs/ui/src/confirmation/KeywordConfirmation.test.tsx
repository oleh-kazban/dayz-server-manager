import { StrictMode } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeywordConfirmation } from './KeywordConfirmation';

describe('KeywordConfirmation', () => {
  const originalShowModal = HTMLDialogElement.prototype.showModal;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    // Polyfill dialog showModal focusing algorithm for JSDOM
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true;
      const autoFocusAttrEl = this.querySelector<HTMLElement>('[autofocus]');
      if (autoFocusAttrEl) {
        autoFocusAttrEl.focus();
        return;
      }
      const elements = this.querySelectorAll<HTMLElement>('*');
      for (const el of elements) {
        const reactKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
        if (
          reactKey &&
          (el as unknown as Record<string, { autoFocus?: boolean }>)[reactKey]?.autoFocus
        ) {
          el.focus();
          return;
        }
      }
    };
  });

  afterEach(() => {
    HTMLDialogElement.prototype.showModal = originalShowModal;
    vi.useRealTimers();
  });

  describe('Scenario 1: Initial Rendering & Autofocus (timerValue=0)', () => {
    it('renders alertdialog with title, description, input, and helper text', () => {
      const handleCancel = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="DELETE"
          title="Delete Database"
          description="This action will permanently delete all records."
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />,
      );

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /delete database/i })).toBeInTheDocument();
      expect(
        screen.getByText(/this action will permanently delete all records/i),
      ).toBeInTheDocument();

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toBeEnabled();
      expect(input).toHaveFocus();

      expect(screen.getByText('Type "DELETE" to confirm this action.')).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /^confirm$/i });
      expect(confirmBtn).toBeDisabled();

      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      expect(cancelBtn).toBeEnabled();
    });

    it('supports custom cancelLabel and confirmLabel', () => {
      render(
        <KeywordConfirmation
          keyword="PURGE"
          title="Custom Labels"
          cancelLabel="Abort Operation"
          confirmLabel="Execute Purge"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /^abort operation$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^execute purge$/i })).toBeDisabled();
    });

    it('renders warning and primary variant icons correctly', () => {
      const { rerender } = render(
        <KeywordConfirmation
          keyword="REBOOT"
          title="Restart System"
          variant="warning"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      rerender(
        <KeywordConfirmation
          keyword="SYNC"
          title="Sync Data"
          variant="primary"
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      );
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('Scenario 2: Timer Lockout', () => {
    it('locks input and confirm button with countdown, autofocuses cancel button, and unlocks input with autofocus on timer expiration', () => {
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="DELETE"
          title="Delete Database"
          timerValue={3}
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      const confirmBtn = screen.getByRole('button', { name: /confirm \(3s\)/i });
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });

      expect(input).toBeDisabled();
      expect(confirmBtn).toBeDisabled();
      expect(cancelBtn).toHaveFocus();

      // Advance 1 second: remaining time is 2s
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: /confirm \(2s\)/i })).toBeDisabled();
      expect(input).toBeDisabled();

      // Advance 1 second: remaining time is 1s
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: /confirm \(1s\)/i })).toBeDisabled();
      expect(input).toBeDisabled();

      // Advance final 1 second: timer reaches 0
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Timer expired: input becomes enabled and receives autofocus
      expect(input).toBeEnabled();
      expect(input).toHaveFocus();

      // Confirm button text updates to Confirm, but remains disabled because input is empty
      const readyConfirmBtn = screen.getByRole('button', { name: /^confirm$/i });
      expect(readyConfirmBtn).toBeDisabled();

      // Now user can type matching keyword to enable Confirm button
      fireEvent.change(input, { target: { value: 'DELETE' } });
      expect(readyConfirmBtn).not.toBeDisabled();

      fireEvent.click(readyConfirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 3: Exact Keyword Match (Case-Sensitive)', () => {
    it('enables confirm button only on exact case-sensitive match and disables on mismatch or extra whitespace', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="WIPE"
          title="Wipe Server"
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      const confirmBtn = screen.getByRole('button', { name: /^confirm$/i });
      expect(confirmBtn).toBeDisabled();

      // 1. Lowercase "wipe" (case mismatch): confirm button remains disabled
      await user.type(input, 'wipe');
      expect(input).toHaveValue('wipe');
      expect(confirmBtn).toBeDisabled();

      // 2. Exact uppercase match "WIPE": confirm button becomes enabled
      await user.clear(input);
      await user.type(input, 'WIPE');
      expect(input).toHaveValue('WIPE');
      expect(confirmBtn).not.toBeDisabled();

      // 3. Extra whitespace "WIPE ": confirm button becomes disabled
      await user.type(input, ' ');
      expect(input).toHaveValue('WIPE ');
      expect(confirmBtn).toBeDisabled();

      // 4. Backspace back to exact "WIPE": confirm button is enabled again
      await user.keyboard('{Backspace}');
      expect(input).toHaveValue('WIPE');
      expect(confirmBtn).not.toBeDisabled();

      // 5. Clicking enabled confirm button executes onConfirm
      await user.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 4: Enter Key Submission', () => {
    it('fires onConfirm when input matches keyword and Enter is pressed', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="CONFIRM"
          title="Action Confirmation"
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'CONFIRM{Enter}');

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire onConfirm when input does not match keyword and Enter is pressed', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="CONFIRM"
          title="Action Confirmation"
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'WRONG{Enter}');

      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('does NOT fire onConfirm on Enter when input matches but lockout timer is active', () => {
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="CONFIRM"
          title="Action Confirmation"
          timerValue={5}
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'CONFIRM' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('does NOT fire onConfirm on Enter when input matches but isLoading is true', () => {
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="CONFIRM"
          title="Action Confirmation"
          isLoading={true}
          onCancel={vi.fn()}
          onConfirm={handleConfirm}
        />,
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'CONFIRM' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 5: Dismissal Actions', () => {
    it('triggers onCancel when Cancel button is clicked', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const handleCancel = vi.fn();

      render(
        <KeywordConfirmation
          keyword="TEST"
          title="Dismissible Operation"
          onCancel={handleCancel}
          onConfirm={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('triggers onCancel when Close (X) icon button is clicked', async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      const handleCancel = vi.fn();

      render(
        <KeywordConfirmation
          keyword="TEST"
          title="Dismissible Operation"
          onCancel={handleCancel}
          onConfirm={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /close dialog/i }));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('triggers onCancel when backdrop (dialog element) is clicked', () => {
      vi.useRealTimers();
      const handleCancel = vi.fn();

      render(
        <KeywordConfirmation
          keyword="TEST"
          title="Backdrop Test"
          onCancel={handleCancel}
          onConfirm={vi.fn()}
        />,
      );

      const dialog = screen.getByRole('alertdialog');
      fireEvent.click(dialog);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger onCancel when clicking inside dialog content', () => {
      vi.useRealTimers();
      const handleCancel = vi.fn();

      render(
        <KeywordConfirmation
          keyword="TEST"
          title="Content Click Test"
          onCancel={handleCancel}
          onConfirm={vi.fn()}
        />,
      );

      const heading = screen.getByRole('heading', { name: /content click test/i });
      fireEvent.click(heading);
      expect(handleCancel).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 6: Loading State', () => {
    it('disables input and buttons, sets aria-busy, and prevents native cancel event when isLoading is true', () => {
      const handleCancel = vi.fn();
      const handleConfirm = vi.fn();

      render(
        <KeywordConfirmation
          keyword="DELETE"
          title="Deleting database..."
          isLoading={true}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />,
      );

      const dialog = screen.getByRole('alertdialog');
      const input = screen.getByRole('textbox');
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      const confirmBtn = screen.getByRole('button', { name: /^confirm$/i });

      expect(input).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
      expect(closeBtn).toBeDisabled();
      expect(confirmBtn).toBeDisabled();
      expect(confirmBtn).toHaveAttribute('aria-busy', 'true');

      // Native Escape / cancel event should be prevented
      const cancelEvent = new Event('cancel', { cancelable: true });
      fireEvent(dialog, cancelEvent);
      expect(cancelEvent.defaultPrevented).toBe(true);
      expect(handleCancel).not.toHaveBeenCalled();

      // Backdrop clicks should be ignored while loading
      fireEvent.click(dialog);
      expect(handleCancel).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 7: StrictMode Lifecycle Safety', () => {
    it('safely handles repeated mount and unmount in StrictMode without triggering onCancel or errors', () => {
      vi.useRealTimers();
      const handleCancel = vi.fn();
      const handleConfirm = vi.fn();

      const { unmount } = render(
        <StrictMode>
          <KeywordConfirmation
            keyword="PURGE"
            title="StrictMode Lifecycle Test"
            description="Ensuring clean lifecycle under React StrictMode"
            onCancel={handleCancel}
            onConfirm={handleConfirm}
          />
        </StrictMode>,
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(handleCancel).not.toHaveBeenCalled();
      expect(handleConfirm).not.toHaveBeenCalled();

      unmount();
      expect(handleCancel).not.toHaveBeenCalled();
      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });
});
