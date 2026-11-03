import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

export type DropPosition = 'above' | 'below';

export interface UseSortableListOptions<T> {
  /** The list of items to sort. */
  items: T[];
  /** Function returning unique string id for an item. */
  getId: (item: T) => string;
  /** Callback fired when items are reordered via drag-and-drop or keyboard actions. */
  onReorder?: (reordered: T[]) => void;
  /** Whether sorting is globally disabled. Defaults to false. */
  disabled?: boolean;
  /** Optional predicate to mark specific items as locked (cannot be moved or displaced). */
  isItemLocked?: (item: T) => boolean;
}

export interface SortableItemDOMProps {
  draggable: boolean;
  onDragStart?: (e: ReactDragEvent) => void;
  onDragOver?: (e: ReactDragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: ReactDragEvent) => void;
  onDragEnd?: () => void;
}

export interface SortableHandleDOMProps {
  onKeyDown: (e: ReactKeyboardEvent) => void;
}

export interface UseSortableListReturn {
  draggedId: string | null;
  dragOverId: string | null;
  dragOverPosition: DropPosition;
  isItemDragging: (id: string) => boolean;
  getItemDropIndicator: (id: string) => DropPosition | null;
  moveItem: (id: string, direction: 'up' | 'down') => void;
  getItemProps: (id: string, isLocked?: boolean) => SortableItemDOMProps;
  getHandleProps: (id: string, isLocked?: boolean) => SortableHandleDOMProps;
}

export function useSortableList<T>({
  items,
  getId,
  onReorder,
  disabled = false,
  isItemLocked,
}: UseSortableListOptions<T>): UseSortableListReturn {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DropPosition>('above');

  const draggedIdRef = useRef<string | null>(null);
  const dragOverPositionRef = useRef<DropPosition>('above');

  const handleDragStart = useCallback((e: ReactDragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    draggedIdRef.current = id;
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: ReactDragEvent, id: string) => {
    const activeDraggedId = draggedIdRef.current;
    if (!activeDraggedId || activeDraggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: DropPosition = e.clientY < midY ? 'above' : 'below';

    dragOverPositionRef.current = position;
    setDragOverId(id);
    setDragOverPosition(position);
  }, []);

  const handleDragLeave = useCallback((id: string) => {
    setDragOverId(prev => (prev === id ? null : prev));
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (e: ReactDragEvent, targetId: string) => {
      e.preventDefault();
      const activeDraggedId = draggedIdRef.current;
      const position = dragOverPositionRef.current;

      if (!activeDraggedId || activeDraggedId === targetId || !onReorder) {
        handleDragEnd();
        return;
      }

      const sourceIndex = items.findIndex(item => getId(item) === activeDraggedId);
      let targetIndex = items.findIndex(item => getId(item) === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        handleDragEnd();
        return;
      }

      if (position === 'below' && sourceIndex > targetIndex) {
        targetIndex += 1;
      } else if (position === 'above' && sourceIndex < targetIndex) {
        targetIndex -= 1;
      }

      if (isItemLocked?.(items[targetIndex])) {
        handleDragEnd();
        return;
      }

      const next = [...items];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      onReorder(next);
      handleDragEnd();
    },
    [getId, handleDragEnd, isItemLocked, items, onReorder],
  );

  const moveItem = useCallback(
    (id: string, direction: 'up' | 'down') => {
      if (disabled || !onReorder) return;
      const index = items.findIndex(item => getId(item) === id);
      if (index === -1) return;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      if (isItemLocked?.(items[targetIndex])) return;

      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      onReorder(next);
    },
    [disabled, getId, isItemLocked, items, onReorder],
  );

  const getItemProps = useCallback(
    (id: string, isLockedOverride?: boolean): SortableItemDOMProps => {
      const item = items.find(i => getId(i) === id);
      const isLocked = isLockedOverride ?? (item ? Boolean(isItemLocked?.(item)) : false);
      const canDrag = !disabled && Boolean(onReorder) && !isLocked;

      if (!canDrag) {
        return { draggable: false };
      }

      return {
        draggable: true,
        onDragStart: (e: ReactDragEvent) => handleDragStart(e, id),
        onDragOver: (e: ReactDragEvent) => handleDragOver(e, id),
        onDragLeave: () => handleDragLeave(id),
        onDrop: (e: ReactDragEvent) => handleDrop(e, id),
        onDragEnd: handleDragEnd,
      };
    },
    [
      disabled,
      getId,
      handleDragEnd,
      handleDragLeave,
      handleDragOver,
      handleDragStart,
      handleDrop,
      isItemLocked,
      items,
      onReorder,
    ],
  );

  const getHandleProps = useCallback(
    (id: string, isLockedOverride?: boolean): SortableHandleDOMProps => {
      const item = items.find(i => getId(i) === id);
      const isLocked = isLockedOverride ?? (item ? Boolean(isItemLocked?.(item)) : false);

      return {
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (disabled || !onReorder || isLocked) return;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveItem(id, 'up');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveItem(id, 'down');
          }
        },
      };
    },
    [disabled, getId, isItemLocked, items, moveItem, onReorder],
  );

  const getItemDropIndicator = useCallback(
    (id: string): DropPosition | null => {
      if (dragOverId !== id || draggedId === id) {
        return null;
      }
      return dragOverPosition;
    },
    [dragOverId, dragOverPosition, draggedId],
  );

  const isItemDragging = useCallback((id: string): boolean => draggedId === id, [draggedId]);

  return {
    draggedId,
    dragOverId,
    dragOverPosition,
    isItemDragging,
    getItemDropIndicator,
    moveItem,
    getItemProps,
    getHandleProps,
  };
}
