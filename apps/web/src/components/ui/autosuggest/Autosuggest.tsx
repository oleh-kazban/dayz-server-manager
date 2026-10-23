import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Loader2, Search, X } from 'lucide-react';

import { usePopup } from '@dsm/core/hooks';

export interface AutosuggestProps<T> {
  value: string;
  onChange: (_value: string) => void;
  items: T[];
  isLoading?: boolean;
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
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { isOpen, open, close, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup<HTMLInputElement>('start');

  const isQueryTooShort = value.trim().length < minChars;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        open();
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (items.length > 0) {
        setHighlightedIndex(prev => (prev + 1) % items.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length > 0) {
        setHighlightedIndex(prev => (prev <= 0 ? items.length - 1 : prev - 1));
      }
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0 && items[highlightedIndex]) {
        event.preventDefault();
        handleSelect(items[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      close();
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  const renderContent = () => {
    if (isQueryTooShort) {
      return (
        <div className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]">
          {minCharsHint ?? `Please type at least ${minChars} characters to search...`}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--color-text-muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
          <span>Searching...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return <div className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]">{emptyText}</div>;
    }

    return items.map((item, index) => {
      const isHighlighted = highlightedIndex === index;
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
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={open}
          onClick={open}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-8 text-xs text-[var(--color-text-main)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
        />

        {value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              setHighlightedIndex(-1);
              triggerRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-main)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? 'Search suggestions'}
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
            {renderContent()}
          </div>,
          document.body,
        )}
    </div>
  );
}
