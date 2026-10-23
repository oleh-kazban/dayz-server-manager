import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Loader2, Search, X } from 'lucide-react';

import { usePopup } from '../hooks';

export interface AutosuggestProps<T> {
  value: string;
  onChange: (_value: string) => void;
  items: T[];
  isLoading?: boolean;
  disabled?: boolean;
  onSelect: (_item: T) => void;
  getOptionLabel: (_item: T) => string;
  getOptionKey: (_item: T) => string | number;
  renderOption?: (_item: T, _isHighlighted: boolean) => ReactNode;
  placeholder?: string;
  minChars?: number;
  emptyText?: string;
  minCharsHint?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}

export function Autosuggest<T>({
  value,
  onChange,
  items,
  isLoading = false,
  disabled = false,
  onSelect,
  getOptionLabel,
  getOptionKey,
  renderOption,
  placeholder = 'Search...',
  minChars = 3,
  emptyText = 'No results found',
  minCharsHint,
  className = '',
  inputClassName = '',
  ariaLabel,
}: AutosuggestProps<T>) {
  const listboxId = useId();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [prevItems, setPrevItems] = useState(items);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset highlighted index immediately when result set changes (e.g. async fetch resolution)
  if (items !== prevItems) {
    setPrevItems(items);
    setHighlightedIndex(-1);
  }

  const { isOpen, open, close, popupPosition, containerRef, triggerRef, popupRef, updatePosition } =
    usePopup<HTMLInputElement>('start');

  const isQueryTooShort = value.trim().length < minChars;
  const isPopupOpen = !disabled && isOpen;
  const hasOptions = isPopupOpen && !isQueryTooShort && !isLoading && items.length > 0;

  // Derive highlighted index during render to guarantee it never outlives current options
  const isHighlightedValid = hasOptions && highlightedIndex >= 0 && highlightedIndex < items.length;
  const effectiveHighlightedIndex = isHighlightedValid ? highlightedIndex : -1;

  // Reposition whenever items or loading status resolves while popup is open
  useEffect(() => {
    if (isPopupOpen) {
      updatePosition();
    }
  }, [items, isLoading, isPopupOpen, updatePosition]);

  // Synchronize usePopup internal state if component is disabled while open
  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  const handleOpen = () => {
    if (!disabled && !isOpen) {
      open();
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(event.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      open();
    }
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    close();
    setHighlightedIndex(-1);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (
      nextTarget &&
      (containerRef.current?.contains(nextTarget) || popupRef.current?.contains(nextTarget))
    ) {
      return;
    }
    close();
    setHighlightedIndex(-1);
  };

  const handleClosedKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open();
    if (items.length > 0) {
      setHighlightedIndex(event.key === 'ArrowDown' ? 0 : items.length - 1);
    }
  };

  const handleOpenKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (items.length > 0) {
          setHighlightedIndex(prev => {
            const current = prev >= 0 && prev < items.length ? prev : -1;
            return (current + 1) % items.length;
          });
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (items.length > 0) {
          setHighlightedIndex(prev => {
            const current = prev >= 0 && prev < items.length ? prev : 0;
            return current <= 0 ? items.length - 1 : current - 1;
          });
        }
        break;
      case 'Enter':
        if (effectiveHighlightedIndex >= 0 && effectiveHighlightedIndex < items.length) {
          event.preventDefault();
          handleSelect(items[effectiveHighlightedIndex]);
        }
        break;
      case 'Escape':
        close();
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!isOpen) {
      handleClosedKeyDown(event);
    } else {
      handleOpenKeyDown(event);
    }
  };

  useEffect(() => {
    if (effectiveHighlightedIndex >= 0 && optionRefs.current[effectiveHighlightedIndex]) {
      optionRefs.current[effectiveHighlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [effectiveHighlightedIndex]);

  const renderStatus = () => {
    if (isQueryTooShort) {
      return (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]"
        >
          {minCharsHint ?? `Please type at least ${minChars} characters to search...`}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--color-text-muted)]"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
          <span>Searching...</span>
        </div>
      );
    }

    return (
      <div
        role="status"
        aria-live="polite"
        className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]"
      >
        {emptyText}
      </div>
    );
  };

  const renderOptions = () => {
    return items.map((item, index) => {
      const isHighlighted = effectiveHighlightedIndex === index;
      const key = getOptionKey(item);
      const label = getOptionLabel(item);

      return (
        <div
          key={key}
          id={`${listboxId}-option-${index}`}
          ref={element => {
            optionRefs.current[index] = element;
          }}
          role="option"
          tabIndex={-1}
          aria-selected={isHighlighted}
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => handleSelect(item)}
          className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            isHighlighted
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]'
          }`}
        >
          {renderOption ? (
            renderOption(item, isHighlighted)
          ) : (
            <span className="truncate">{label}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        />

        <input
          ref={triggerRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isPopupOpen}
          aria-controls={hasOptions ? listboxId : undefined}
          aria-activedescendant={
            hasOptions && effectiveHighlightedIndex >= 0
              ? `${listboxId}-option-${effectiveHighlightedIndex}`
              : undefined
          }
          disabled={disabled}
          aria-disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleOpen}
          onBlur={handleBlur}
          onClick={handleOpen}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-8 text-xs text-[var(--color-text-main)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-subtle)] [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
        />

        {!disabled && value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              setHighlightedIndex(-1);
              triggerRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-main)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isPopupOpen &&
        createPortal(
          <div
            ref={popupRef}
            onMouseDown={event => {
              // Prevent input blur before option onClick executes
              event.preventDefault();
            }}
            className="fixed z-50 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
            style={{
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              width: popupPosition?.width ?? 'auto',
              ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            data-placement={popupPosition?.placement}
          >
            {hasOptions ? (
              <div id={listboxId} role="listbox" aria-label={ariaLabel ?? 'Search suggestions'}>
                {renderOptions()}
              </div>
            ) : (
              renderStatus()
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
