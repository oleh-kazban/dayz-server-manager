import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Loader2, Search, X } from 'lucide-react';

import { usePopup } from '../hooks';

import type { AutosuggestProps } from './Autosuggest.types';

export type { AutosuggestProps };

export function Autosuggest<T>({
  ref,
  id: externalId,
  name,
  label,
  error,
  required = false,
  disabled = false,
  value,
  onChange,
  items,
  onSelect,
  getOptionLabel,
  getOptionKey,
  renderOption,
  placeholder = 'Search...',
  minChars = 1,
  emptyText = 'No results found',
  isLoading = false,
  className = '',
  containerClassName = '',
  customClassName = '',
  'aria-label': ariaLabel,
}: AutosuggestProps<T>) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSelectionCommitted, setIsSelectionCommitted] = useState(false);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { isOpen, open, close, popupPosition, containerRef, triggerRef, popupRef, updatePosition } =
    usePopup<HTMLInputElement>('start');

  const handleInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      triggerRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as RefObject<HTMLInputElement | null>).current = element;
      }
    },
    [ref, triggerRef],
  );

  const isQueryMet = value.trim().length >= minChars;
  const isPopupOpen = !disabled && isOpen && isQueryMet;
  const hasOptions = isPopupOpen && !isLoading && items.length > 0;

  // Derive highlighted index during render to guarantee it never outlives current options
  const isHighlightedValid = hasOptions && highlightedIndex >= 0 && highlightedIndex < items.length;
  const effectiveHighlightedIndex = isHighlightedValid ? highlightedIndex : -1;

  // Reposition whenever items or loading status resolves while popup is open
  useEffect(() => {
    if (isPopupOpen) {
      updatePosition();
    }
  }, [items, isLoading, isPopupOpen, updatePosition]);

  // Synchronize popup state if component becomes disabled while open
  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  const handleOpen = () => {
    if (!disabled && isQueryMet && !isOpen && !isSelectionCommitted) {
      open();
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setIsSelectionCommitted(false);
    const nextValue = event.target.value;
    onChange(nextValue);
    setHighlightedIndex(-1);

    if (nextValue.trim().length >= minChars) {
      if (!isOpen) {
        open();
      }
    } else {
      if (isOpen) {
        close();
      }
    }
  };

  const handleSelect = (item: T) => {
    setIsSelectionCommitted(true);
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
    if (!isQueryMet) return;
    event.preventDefault();
    setIsSelectionCommitted(false);
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
        if (isPopupOpen) {
          event.preventDefault();
          if (effectiveHighlightedIndex >= 0 && effectiveHighlightedIndex < items.length) {
            handleSelect(items[effectiveHighlightedIndex]);
          }
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
          className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
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

  const resolvedContainerClass = containerClassName || customClassName || className;

  return (
    <div ref={containerRef} className={`space-y-1.5 text-left ${resolvedContainerClass}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-xs font-medium select-none ${
            disabled
              ? 'cursor-not-allowed opacity-50 text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-main)]'
          }`}
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] h-4 w-4"
        />

        <input
          ref={handleInputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isPopupOpen}
          aria-controls={isPopupOpen ? listboxId : undefined}
          aria-activedescendant={
            hasOptions && effectiveHighlightedIndex >= 0
              ? `${listboxId}-option-${effectiveHighlightedIndex}`
              : undefined
          }
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          disabled={disabled}
          aria-disabled={disabled}
          required={required}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleOpen}
          onBlur={handleBlur}
          onClick={handleOpen}
          placeholder={placeholder}
          className={`w-full h-9 rounded-lg border bg-[var(--color-surface)] font-sans text-xs text-[var(--color-text-main)] shadow-xs outline-none transition-colors placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-surface-subtle)] [&::-webkit-search-cancel-button]:hidden ${
            !disabled && value.length > 0 ? 'pl-9 pr-8' : 'pl-9 pr-3.5'
          } ${
            error
              ? 'border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)] focus:ring-1 focus:ring-[var(--color-status-danger)]'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
          }`}
        />

        {!disabled && value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setIsSelectionCommitted(false);
              onChange('');
              setHighlightedIndex(-1);
              close();
              triggerRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-main)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] font-sans text-[var(--color-status-danger)] leading-tight"
        >
          {error}
        </p>
      )}

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
              maxWidth: popupPosition?.maxWidth ?? 'none',
              ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            data-placement={popupPosition?.placement}
          >
            <div id={listboxId} role="listbox" aria-label={ariaLabel ?? 'Search suggestions'}>
              {hasOptions ? renderOptions() : renderStatus()}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
