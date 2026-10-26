import { type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSortableList } from './useSortableList';

interface TestItem {
  id: string;
  name: string;
  isLocked?: boolean;
}

const mockItems: TestItem[] = [
  { id: 'item-1', name: 'Item 1' },
  { id: 'item-2', name: 'Item 2' },
  { id: 'item-3', name: 'Item 3' },
];

function createMockDragEvent(overrides: Partial<ReactDragEvent> = {}): ReactDragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      setData: vi.fn(),
      effectAllowed: 'none',
      dropEffect: 'none',
    } as unknown as DataTransfer,
    currentTarget: {
      getBoundingClientRect: () => ({
        top: 100,
        height: 40,
        bottom: 140,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: 100,
        toJSON: () => {},
      }),
    } as unknown as EventTarget & Element,
    clientY: 110,
    ...overrides,
  } as unknown as ReactDragEvent;
}

function createMockKeyboardEvent(key: string): ReactKeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as ReactKeyboardEvent;
}

describe('useSortableList', () => {
  it('initializes with default idle state', () => {
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder: vi.fn(),
      }),
    );

    expect(result.current.draggedId).toBeNull();
    expect(result.current.dragOverId).toBeNull();
    expect(result.current.dragOverPosition).toBe('above');
    expect(result.current.isItemDragging('item-1')).toBe(false);
    expect(result.current.getItemDropIndicator('item-1')).toBeNull();
  });

  it('disables item dragging when onReorder is missing or disabled is true', () => {
    const { result: noReorderResult } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
      }),
    );

    expect(noReorderResult.current.getItemProps('item-1')).toEqual({ draggable: false });

    const { result: disabledResult } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder: vi.fn(),
        disabled: true,
      }),
    );

    expect(disabledResult.current.getItemProps('item-1')).toEqual({ draggable: false });
  });

  it('respects isLocked flag per item or via isItemLocked callback', () => {
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder: vi.fn(),
        isItemLocked: item => item.id === 'item-1',
      }),
    );

    expect(result.current.getItemProps('item-1')).toEqual({ draggable: false });
    expect(result.current.getItemProps('item-2').draggable).toBe(true);

    // Override via parameter
    expect(result.current.getItemProps('item-2', true)).toEqual({ draggable: false });
  });

  it('handles drag-and-drop lifecycle and calculates reordered list', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder,
      }),
    );

    const item1Props = result.current.getItemProps('item-1');
    const item3Props = result.current.getItemProps('item-3');

    // Drag start on item-1
    const dragStartEvent = createMockDragEvent();
    act(() => {
      item1Props.onDragStart?.(dragStartEvent);
    });

    expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'item-1');
    expect(result.current.draggedId).toBe('item-1');
    expect(result.current.isItemDragging('item-1')).toBe(true);

    // Drag over item-3 below its midpoint (midpoint is 100 + 20 = 120, clientY 130 is below)
    const dragOverBelowEvent = createMockDragEvent({ clientY: 130 });
    act(() => {
      item3Props.onDragOver?.(dragOverBelowEvent);
    });

    expect(dragOverBelowEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.dragOverId).toBe('item-3');
    expect(result.current.dragOverPosition).toBe('below');
    expect(result.current.getItemDropIndicator('item-3')).toBe('below');
    expect(result.current.getItemDropIndicator('item-1')).toBeNull(); // Dragged item never shows indicator

    // Drop item-1 onto item-3 below
    const dropEvent = createMockDragEvent();
    act(() => {
      item3Props.onDrop?.(dropEvent);
    });

    expect(onReorder).toHaveBeenCalledWith([
      { id: 'item-2', name: 'Item 2' },
      { id: 'item-3', name: 'Item 3' },
      { id: 'item-1', name: 'Item 1' },
    ]);
    expect(result.current.draggedId).toBeNull();
    expect(result.current.dragOverId).toBeNull();
  });

  it('supports dragOver above midpoint and clean dragLeave', () => {
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder: vi.fn(),
      }),
    );

    const item1Props = result.current.getItemProps('item-1');
    const item2Props = result.current.getItemProps('item-2');

    act(() => {
      item1Props.onDragStart?.(createMockDragEvent());
    });

    // clientY 105 is above midY (120)
    act(() => {
      item2Props.onDragOver?.(createMockDragEvent({ clientY: 105 }));
    });

    expect(result.current.dragOverPosition).toBe('above');
    expect(result.current.getItemDropIndicator('item-2')).toBe('above');

    // Drag leave
    act(() => {
      item2Props.onDragLeave?.();
    });

    expect(result.current.dragOverId).toBeNull();
    expect(result.current.getItemDropIndicator('item-2')).toBeNull();

    // Drag end
    act(() => {
      item1Props.onDragEnd?.();
    });

    expect(result.current.draggedId).toBeNull();
  });

  it('supports keyboard reordering via moveItem and getHandleProps', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder,
      }),
    );

    const handleProps = result.current.getHandleProps('item-2');

    // Move up with ArrowUp
    const arrowUpEvent = createMockKeyboardEvent('ArrowUp');
    act(() => {
      handleProps.onKeyDown(arrowUpEvent);
    });

    expect(arrowUpEvent.preventDefault).toHaveBeenCalled();
    expect(onReorder).toHaveBeenCalledWith([
      { id: 'item-2', name: 'Item 2' },
      { id: 'item-1', name: 'Item 1' },
      { id: 'item-3', name: 'Item 3' },
    ]);

    // Move down with ArrowDown
    onReorder.mockClear();
    const arrowDownEvent = createMockKeyboardEvent('ArrowDown');
    act(() => {
      handleProps.onKeyDown(arrowDownEvent);
    });

    expect(arrowDownEvent.preventDefault).toHaveBeenCalled();
    expect(onReorder).toHaveBeenCalledWith([
      { id: 'item-1', name: 'Item 1' },
      { id: 'item-3', name: 'Item 3' },
      { id: 'item-2', name: 'Item 2' },
    ]);
  });

  it('guards against out-of-bounds keyboard moves and locked target slots', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useSortableList({
        items: mockItems,
        getId: item => item.id,
        onReorder,
        isItemLocked: item => item.id === 'item-1',
      }),
    );

    // item-1 cannot be moved because it is locked
    const lockedHandle = result.current.getHandleProps('item-1');
    act(() => {
      lockedHandle.onKeyDown(createMockKeyboardEvent('ArrowDown'));
    });
    expect(onReorder).not.toHaveBeenCalled();

    // item-2 cannot be moved up because target slot (index 0 / item-1) is locked
    const item2Handle = result.current.getHandleProps('item-2');
    act(() => {
      item2Handle.onKeyDown(createMockKeyboardEvent('ArrowUp'));
    });
    expect(onReorder).not.toHaveBeenCalled();

    // item-3 cannot be moved past bottom boundary
    const item3Handle = result.current.getHandleProps('item-3');
    act(() => {
      item3Handle.onKeyDown(createMockKeyboardEvent('ArrowDown'));
    });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
