import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type PopupPosition, usePopup } from './usePopup';

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

  it('preserves popupPosition object reference when updatePosition computes identical coordinates and allocates a new one when changed (REQ-03)', async () => {
    const user = userEvent.setup();
    const recordedPositions: (PopupPosition | null)[] = [];

    function PositionReferenceConsumer() {
      const { isOpen, open, updatePosition, containerRef, triggerRef, popupRef, popupPosition } =
        usePopup('start');

      recordedPositions.push(popupPosition);

      return (
        <div ref={containerRef}>
          <button ref={triggerRef} type="button" onClick={open}>
            Open
          </button>
          <button type="button" onClick={updatePosition}>
            Update Position
          </button>
          {isOpen && (
            <div ref={popupRef} data-testid="popup">
              Popup
            </div>
          )}
        </div>
      );
    }

    render(<PositionReferenceConsumer />);

    const trigger = screen.getByRole('button', { name: /^open$/i });
    const updateBtn = screen.getByRole('button', { name: /update position/i });

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

    await user.click(trigger);
    const posBefore = recordedPositions.at(-1);
    expect(posBefore).not.toBeNull();

    await user.click(updateBtn);
    const posAfterUnchanged = recordedPositions.at(-1);
    expect(posAfterUnchanged).toBe(posBefore);

    mockRect = {
      ...mockRect,
      top: 80,
      bottom: 116,
      left: 50,
      right: 150,
      x: 50,
      y: 80,
    };
    await user.click(updateBtn);
    const posAfterChange = recordedPositions.at(-1);
    expect(posAfterChange).not.toBe(posBefore);
    expect(posAfterChange).toMatchObject({ top: 124, left: 50 });

    rectSpy.mockRestore();
  });

  it('uses unscaled popup.offsetWidth over transformed getBoundingClientRect().width for end alignment (REQ-01)', async () => {
    const user = userEvent.setup();

    function EndAlignedPopupConsumer() {
      const { isOpen, open, updatePosition, containerRef, triggerRef, popupRef, popupPosition } =
        usePopup('end');

      return (
        <div ref={containerRef}>
          <button ref={triggerRef} type="button" onClick={open}>
            Open End Menu
          </button>
          <button type="button" onClick={updatePosition}>
            Recalculate
          </button>
          {isOpen && (
            <div
              ref={node => {
                popupRef.current = node;
                if (node) {
                  Object.defineProperty(node, 'offsetWidth', {
                    configurable: true,
                    value: 384,
                  });
                  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
                    width: 364.8,
                    height: 200,
                    top: 0,
                    left: 0,
                    right: 364.8,
                    bottom: 200,
                    x: 0,
                    y: 0,
                    toJSON: () => ({}),
                  });
                }
              }}
              data-testid="end-popup"
              data-left={popupPosition ? String(popupPosition.left) : 'null'}
              style={{ left: popupPosition?.left }}
            >
              Menu
            </div>
          )}
        </div>
      );
    }

    render(<EndAlignedPopupConsumer />);

    const trigger = screen.getByRole('button', { name: /open end menu/i });
    const triggerSpy = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 46,
      left: 742,
      right: 778,
      width: 36,
      height: 36,
      x: 742,
      y: 10,
      toJSON: () => ({}),
    });

    await user.click(trigger);

    const popup = screen.getByTestId('end-popup');
    expect(popup).toHaveAttribute('data-left', '394');
    expect(popup).toHaveStyle({ left: '394px' });

    await user.click(screen.getByRole('button', { name: /recalculate/i }));
    expect(popup).toHaveAttribute('data-left', '394');
    expect(popup).toHaveStyle({ left: '394px' });

    triggerSpy.mockRestore();
  });
});
