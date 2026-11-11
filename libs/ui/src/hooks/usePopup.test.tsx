import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { usePopup } from './usePopup';

function TestPopupConsumer() {
  const { isOpen, open, close, toggle, containerRef, triggerRef, popupRef, popupPosition } =
    usePopup('start');

  return (
    <div ref={containerRef} data-testid="container">
      <button ref={triggerRef} type="button" onClick={toggle}>
        Toggle Trigger
      </button>
      <button type="button" onClick={open}>
        Open
      </button>
      <button type="button" onClick={close}>
        Close
      </button>
      <span data-testid="position-state" data-positioned={String(popupPosition !== null)}>
        {popupPosition ? `${popupPosition.top},${popupPosition.left}` : 'null'}
      </span>
      {isOpen && (
        <div
          ref={popupRef}
          data-testid="popup"
          style={{ top: popupPosition?.top, left: popupPosition?.left }}
        >
          Popup Content
        </div>
      )}
    </div>
  );
}

function CompositeTriggerPopupConsumer() {
  const { isOpen, open, containerRef, triggerRef, popupRef } = usePopup<HTMLDivElement>('start');

  return (
    <div ref={containerRef} data-testid="container">
      <div ref={triggerRef} data-testid="composite-trigger">
        <button type="button" data-testid="preceding-button">
          Preceding Button
        </button>
        <input type="text" data-testid="trigger-input" onFocus={open} />
      </div>
      {isOpen && (
        <div ref={popupRef} data-testid="popup">
          Popup Content
        </div>
      )}
    </div>
  );
}

describe('usePopup', () => {
  it('manages open, close, and toggle state transitions', () => {
    const { result } = renderHook(() => usePopup());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('closes popup on Escape key and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<TestPopupConsumer />);

    const trigger = screen.getByRole('button', { name: /toggle trigger/i });
    await user.click(trigger);
    expect(screen.getByTestId('popup')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('dismisses popup on outside pointerdown interaction', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TestPopupConsumer />
        <button type="button">Outside Element</button>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: /toggle trigger/i });
    await user.click(trigger);
    expect(screen.getByTestId('popup')).toBeInTheDocument();

    // Click outside
    fireEvent.pointerDown(screen.getByRole('button', { name: /outside element/i }));
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('prioritizes restoring focus to input rather than preceding button in composite trigger on Escape', async () => {
    const user = userEvent.setup();
    render(<CompositeTriggerPopupConsumer />);

    const input = screen.getByTestId('trigger-input');
    const button = screen.getByTestId('preceding-button');

    await user.click(input);
    expect(screen.getByTestId('popup')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(button).not.toHaveFocus();
  });

  it('starts with popupPosition=null, resolves on open, and resets to null across close, toggle, outside pointerdown, and Escape (REQ-01, REQ-02)', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TestPopupConsumer />
        <button type="button">Outside Element</button>
      </div>,
    );

    const trigger = screen.getByRole('button', { name: /toggle trigger/i });
    const openBtn = screen.getByRole('button', { name: /^open$/i });
    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    const positionState = screen.getByTestId('position-state');

    let mockRect = {
      top: 10,
      bottom: 46,
      left: 20,
      right: 120,
      width: 100,
      height: 36,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    };
    const rectSpy = vi.spyOn(trigger, 'getBoundingClientRect').mockImplementation(() => mockRect);

    expect(positionState).toHaveAttribute('data-positioned', 'false');
    expect(positionState).toHaveTextContent('null');

    // 1. Open -> resolves position; Close button -> resets to null
    await user.click(openBtn);
    expect(positionState).toHaveAttribute('data-positioned', 'true');
    expect(positionState).toHaveTextContent('54,20');

    await user.click(closeBtn);
    expect(positionState).toHaveAttribute('data-positioned', 'false');
    expect(positionState).toHaveTextContent('null');

    // 2. Move trigger and reopen via toggle -> uses fresh coordinates; toggle again -> resets to null
    mockRect = {
      ...mockRect,
      top: 100,
      bottom: 136,
      left: 160,
      right: 260,
      x: 160,
      y: 100,
    };
    await user.click(trigger);
    expect(positionState).toHaveAttribute('data-positioned', 'true');
    expect(positionState).toHaveTextContent('144,160');

    await user.click(trigger);
    expect(positionState).toHaveAttribute('data-positioned', 'false');
    expect(positionState).toHaveTextContent('null');

    // 3. Open -> outside pointerdown -> resets to null
    await user.click(openBtn);
    expect(positionState).toHaveAttribute('data-positioned', 'true');
    fireEvent.pointerDown(screen.getByRole('button', { name: /outside element/i }));
    expect(positionState).toHaveAttribute('data-positioned', 'false');
    expect(positionState).toHaveTextContent('null');

    // 4. Open -> Escape -> resets to null
    await user.click(openBtn);
    expect(positionState).toHaveAttribute('data-positioned', 'true');
    await user.keyboard('{Escape}');
    expect(positionState).toHaveAttribute('data-positioned', 'false');
    expect(positionState).toHaveTextContent('null');

    rectSpy.mockRestore();
  });
});
