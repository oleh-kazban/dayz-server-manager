import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { MoreVertical } from 'lucide-react';

import { type Alignment, usePopup } from '../hooks';

export interface DotsFloatingMenuOption {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface DotsFloatingMenuProps {
  options: DotsFloatingMenuOption[];
  alignment?: Alignment;
  ariaLabel: string;
  triggerClassName?: string;
  icon?: ReactNode;
}

const DEFAULT_OPTION_CLASS =
  'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]';

export function DotsFloatingMenu({
  options,
  ariaLabel,
  alignment = 'end',
  triggerClassName = '',
  icon,
}: DotsFloatingMenuProps) {
  const menuId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);
  const isPositioned = popupPosition !== null;

  useEffect(() => {
    if (isOpen && isPositioned) {
      optionRefs.current[0]?.focus();
    }
  }, [isOpen, isPositioned]);

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  };

  const selectOption = (option: DotsFloatingMenuOption) => {
    if (option.disabled) return;
    close();
    triggerRef.current?.focus();
    option.onSelect();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={toggle}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)] ${triggerClassName}`}
      >
        {icon ?? <MoreVertical className="h-4 w-4" />}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={menuId}
            role="menu"
            aria-label={ariaLabel}
            className="fixed z-50 min-w-40 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
            style={{
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            data-placement={popupPosition?.placement}
          >
            {options.map((option, index) => (
              <button
                key={option.label}
                ref={element => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="menuitem"
                disabled={option.disabled}
                onClick={() => selectOption(option)}
                onKeyDown={event => handleOptionKeyDown(event, index)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  option.className ?? DEFAULT_OPTION_CLASS
                }`}
              >
                {option.icon && <span className="shrink-0">{option.icon}</span>}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
