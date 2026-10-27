import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { MoreVertical } from 'lucide-react';

import { usePopup } from '../hooks';

import type { DotsFloatingMenuOption, DotsFloatingMenuProps } from './FloatingMenu.types';

export type { DotsFloatingMenuOption, DotsFloatingMenuProps };

function getOptionClassName(option: DotsFloatingMenuOption): string {
  if (option.className) {
    return option.className;
  }
  if (option.destructive) {
    return 'text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-light)] hover:text-[var(--color-status-danger)]';
  }
  return 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]';
}

export function DotsFloatingMenu({
  ref,
  options,
  ariaLabel,
  alignment = 'end',
  disabled = false,
  customClassName = '',
  icon,
}: DotsFloatingMenuProps) {
  const menuId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);
  const isPositioned = popupPosition !== null;

  const handleTriggerRef = (element: HTMLButtonElement | null) => {
    triggerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLButtonElement | null }).current = element;
    }
  };

  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  useEffect(() => {
    if (isOpen && isPositioned) {
      const firstEnabledIndex = options.findIndex(opt => !opt.disabled);
      if (firstEnabledIndex >= 0) {
        optionRefs.current[firstEnabledIndex]?.focus();
      }
    }
  }, [isOpen, isPositioned, options]);

  const getNextEnabledIndex = (currentIndex: number, step: 1 | -1): number | undefined => {
    let next = currentIndex;
    for (let i = 0; i < options.length; i++) {
      next = (next + step + options.length) % options.length;
      if (!options[next].disabled) {
        return next;
      }
    }
    return undefined;
  };

  const getFirstEnabledIndex = (): number | undefined => {
    for (let i = 0; i < options.length; i++) {
      if (!options[i].disabled) return i;
    }
    return undefined;
  };

  const getLastEnabledIndex = (): number | undefined => {
    for (let i = options.length - 1; i >= 0; i--) {
      if (!options[i].disabled) return i;
    }
    return undefined;
  };

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') {
      nextIndex = getNextEnabledIndex(index, 1);
    } else if (event.key === 'ArrowUp') {
      nextIndex = getNextEnabledIndex(index, -1);
    } else if (event.key === 'Home') {
      nextIndex = getFirstEnabledIndex();
    } else if (event.key === 'End') {
      nextIndex = getLastEnabledIndex();
    }

    if (nextIndex !== undefined) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  };

  const selectOption = (option: DotsFloatingMenuOption) => {
    if (option.disabled || disabled) return;
    close();
    triggerRef.current?.focus();
    option.onSelect();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={handleTriggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] shadow-xs transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${customClassName}`.trim()}
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
            className="fixed z-50 min-w-40 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 font-sans text-xs text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
            style={{
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            data-placement={popupPosition?.placement}
          >
            {options.map((option, index) => {
              const optionClass = getOptionClassName(option);

              return (
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
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-sans font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${optionClass}`}
                >
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
