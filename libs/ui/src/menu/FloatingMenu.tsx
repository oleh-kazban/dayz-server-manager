import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { Check, ChevronDown } from 'lucide-react';

import { type Alignment, usePopup } from '../hooks';

export interface FloatingMenuOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
  className?: string;
  indicatorClassName?: string;
}

export interface FloatingMenuProps<T extends string> {
  options: FloatingMenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  alignment?: Alignment;
  disabled?: boolean;
  customClassName?: string;
  ref?: Ref<HTMLButtonElement>;
}

function OptionIndicator({
  isSelected,
  indicatorClassName,
}: {
  isSelected: boolean;
  indicatorClassName?: string;
}) {
  if (isSelected) {
    return <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />;
  }
  if (indicatorClassName) {
    return (
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${indicatorClassName}`} />
    );
  }
  return null;
}

export function FloatingMenu<T extends string>({
  ref,
  options,
  value,
  ariaLabel,
  onChange,
  alignment = 'end',
  disabled = false,
  customClassName = '',
}: FloatingMenuProps<T>) {
  const menuId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);

  const currentSelectedOption = options.find(option => option.value === value);

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

  const isPositioned = popupPosition !== null;

  useEffect(() => {
    if (isOpen && isPositioned) {
      const selectedIndex = options.findIndex(option => option.value === value);
      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
      optionRefs.current[targetIndex]?.focus();
    }
  }, [isOpen, isPositioned, options, value]);

  const selectOption = (nextValue: T) => {
    if (disabled) return;
    onChange(nextValue);
    close();
    triggerRef.current?.focus();
  };

  if (!currentSelectedOption) {
    return null;
  }

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
        className={`inline-flex h-9 items-center justify-between gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-xs font-sans font-medium text-[var(--color-text-main)] shadow-xs transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:border-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${customClassName} ${
          currentSelectedOption.className ?? ''
        }`.trim()}
      >
        {currentSelectedOption.icon && (
          <span className="shrink-0">{currentSelectedOption.icon}</span>
        )}
        <span className="truncate">{currentSelectedOption.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform duration-200" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={menuId}
            role="menu"
            aria-label={ariaLabel}
            className="fixed z-50 min-w-36 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 font-sans text-xs text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
            style={{
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            data-placement={popupPosition?.placement}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  ref={element => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => selectOption(option.value)}
                  onKeyDown={event => handleOptionKeyDown(event, index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs font-sans font-medium transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>
                  <OptionIndicator
                    isSelected={isSelected}
                    indicatorClassName={option.indicatorClassName}
                  />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
