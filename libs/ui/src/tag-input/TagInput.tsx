import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { usePopup } from '../hooks';
import { Tag } from '../tag';

import { type TagInputProps, type TagOption } from './TagInput.types';

function normalizeSuggestions(suggestions?: (string | TagOption)[]): TagOption[] {
  if (!suggestions) return [];
  return suggestions.map(s => (typeof s === 'string' ? { value: s, label: s } : s));
}

function getContainerBorderClasses(hasError: boolean): string {
  if (hasError) {
    return 'border-[var(--color-status-danger)] focus-within:border-[var(--color-status-danger)] focus-within:ring-1 focus-within:ring-[var(--color-status-danger)]';
  }
  return 'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]';
}

interface SuggestionsPopupProps {
  isOpen: boolean;
  popupPosition: { top: number; left: number; width?: number } | null;
  popupRef: Ref<HTMLDivElement>;
  filteredSuggestions: TagOption[];
  highlightedIndex: number;
  onSelect: (option: TagOption) => void;
}

function SuggestionsPopup({
  isOpen,
  popupPosition,
  popupRef,
  filteredSuggestions,
  highlightedIndex,
  onSelect,
}: SuggestionsPopupProps) {
  if (!isOpen || filteredSuggestions.length === 0) {
    return null;
  }

  return createPortal(
    <div
      ref={popupRef}
      role="listbox"
      aria-label="Tag suggestions"
      style={{
        position: 'fixed',
        top: popupPosition?.top ?? 0,
        left: popupPosition?.left ?? 0,
        width: Math.max(popupPosition?.width ?? 0, 180),
        zIndex: 50,
        visibility: popupPosition ? 'visible' : 'hidden',
      }}
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-1 max-h-52 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-100"
    >
      {filteredSuggestions.map((opt, idx) => {
        const isHighlighted = idx === highlightedIndex;
        const highlightClass = isHighlighted
          ? 'bg-[var(--color-surface-subtle)] text-[var(--color-primary)] font-medium'
          : 'text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)]';

        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            disabled={opt.disabled}
            onMouseDown={e => {
              e.preventDefault();
              onSelect(opt);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${highlightClass}`}
          >
            <span>{opt.label}</span>
            {opt.color && (
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                {opt.color}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function checkDelimiterMatch(key: string, delimiters: string[]): boolean {
  return delimiters.includes(key);
}

function getNextSuggestionIndex(key: string, currentIndex: number, totalCount: number): number {
  if (key === 'ArrowDown') {
    return currentIndex < totalCount - 1 ? currentIndex + 1 : 0;
  }
  if (key === 'ArrowUp') {
    return currentIndex > 0 ? currentIndex - 1 : totalCount - 1;
  }
  return -1;
}

export function TagInput({
  ref,
  id: externalId,
  label,
  error,
  placeholder = 'Add tag...',
  value,
  onChange,
  suggestions,
  delimiters = ['Enter', ','],
  validateTag,
  transformTag = (s: string) => s.trim(),
  maxTags,
  leftIcon,
  disabled = false,
  readOnly = false,
  containerClassName = '',
  className = '',
}: TagInputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [localError, setLocalError] = useState<string | null>(null);

  const { open, close, triggerRef, popupRef, popupPosition } = usePopup<HTMLDivElement>('start');

  const normalized = useMemo(() => normalizeSuggestions(suggestions), [suggestions]);

  const filteredSuggestions = useMemo(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return [];
    return normalized.filter(
      opt => !value.includes(opt.value) && opt.label.toLowerCase().includes(trimmed),
    );
  }, [inputValue, normalized, value]);

  const showSuggestions = isFocused && !disabled && !readOnly && filteredSuggestions.length > 0;

  useEffect(() => {
    if (showSuggestions) {
      open();
    } else {
      close();
    }
  }, [close, open, showSuggestions]);

  const handleInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLInputElement | null }).current = element;
    }
  };

  const commitTag = useCallback(
    (rawTag: string) => {
      const tag = transformTag(rawTag);
      if (!tag) return;

      if (value.includes(tag)) {
        setLocalError('Tag already added');
        return;
      }

      if (maxTags !== undefined && value.length >= maxTags) {
        setLocalError(`Maximum ${maxTags} tags allowed`);
        return;
      }

      if (validateTag) {
        const result = validateTag(tag);
        if (typeof result === 'string') {
          setLocalError(result);
          return;
        }
        if (!result) {
          setLocalError('Invalid tag');
          return;
        }
      }

      setLocalError(null);
      onChange([...value, tag]);
      setInputValue('');
      setHighlightedIndex(-1);
    },
    [maxTags, onChange, transformTag, validateTag, value],
  );

  const removeTag = (tagToRemove: string) => {
    if (disabled || readOnly) return;
    setLocalError(null);
    onChange(value.filter(t => t !== tagToRemove));
  };

  const handleSuggestionKeyDown = (e: KeyboardEvent<HTMLInputElement>): boolean => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      return false;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => getNextSuggestionIndex(e.key, prev, filteredSuggestions.length));
      return true;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setHighlightedIndex(-1);
      return true;
    }

    if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      commitTag(filteredSuggestions[highlightedIndex].value);
      return true;
    }

    return false;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;

    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      e.preventDefault();
      removeTag(value[value.length - 1]);
      return;
    }

    if (handleSuggestionKeyDown(e)) {
      return;
    }

    if (checkDelimiterMatch(e.key, delimiters) && inputValue.trim()) {
      e.preventDefault();
      commitTag(inputValue);
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setLocalError(null);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.closest('[role="listbox"]')) return;

    setIsFocused(false);
    if (inputValue.trim()) {
      commitTag(inputValue);
    }
  };

  const displayError = error ?? localError;
  const borderClasses = getContainerBorderClasses(Boolean(displayError));
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)]'
    : '';

  return (
    <div className={`space-y-1.5 text-left ${containerClassName}`.trim()}>
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

      <div
        ref={triggerRef}
        onClick={handleContainerClick}
        className={`flex flex-wrap items-center min-h-9 px-2.5 py-1 gap-1.5 rounded-lg border bg-[var(--color-surface)] shadow-xs transition-colors cursor-text ${borderClasses} ${disabledClasses}`}
      >
        {leftIcon && <span className="text-[var(--color-text-muted)] shrink-0">{leftIcon}</span>}

        {value.map(tag => (
          <Tag
            key={tag}
            variant="subtle"
            shape="rounded"
            onRemove={!disabled && !readOnly ? () => removeTag(tag) : undefined}
            removeAriaLabel={`Remove ${tag}`}
            className="text-xs"
          >
            {tag}
          </Tag>
        ))}

        {(!maxTags || value.length < maxTags) && (
          <input
            ref={handleInputRef}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={value.length === 0 ? placeholder : ''}
            aria-invalid={Boolean(displayError)}
            aria-describedby={displayError ? `${inputId}-error` : undefined}
            className={`min-w-20 flex-1 bg-transparent border-0 p-0 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:outline-none focus:ring-0 font-sans disabled:cursor-not-allowed ${className}`.trim()}
          />
        )}
      </div>

      <SuggestionsPopup
        isOpen={showSuggestions}
        popupPosition={popupPosition}
        popupRef={popupRef}
        filteredSuggestions={filteredSuggestions}
        highlightedIndex={highlightedIndex}
        onSelect={opt => commitTag(opt.value)}
      />

      {displayError && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] font-sans text-[var(--color-status-danger)] leading-tight"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
