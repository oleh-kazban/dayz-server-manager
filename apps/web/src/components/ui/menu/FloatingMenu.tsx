import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { Check, ChevronDown } from 'lucide-react';

import { type Alignment, usePopup } from '@dsm/core/hooks';

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
  onChange: (_value: T) => void;
  ariaLabel: string;
  alignment?: Alignment;
  triggerClassName?: string;
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
  options,
  value,
  ariaLabel,
  onChange,
  alignment = 'end',
  triggerClassName = '',
}: FloatingMenuProps<T>) {
  const menuId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);

  const currentSelectedOption = options.find(option => option.value === value);

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
      optionRefs.current[0]?.focus();
    }
  }, [isOpen, isPositioned]);

  const selectOption = (nextValue: T) => {
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
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={toggle}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-surface-subtle)] ${triggerClassName} ${
          currentSelectedOption.className ?? ''
        }`}
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
            className="fixed z-50 min-w-36 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
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
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
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
