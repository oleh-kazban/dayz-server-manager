import { type KeyboardEvent, type MouseEvent, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Check, ChevronDown, Search, X } from 'lucide-react';

import { usePopup } from '../hooks';
import { Tag } from '../tag';

import { type TagOption, type TagSelectProps } from './TagInput.types';

function getTriggerBorderClasses(hasError: boolean): string {
  if (hasError) {
    return 'border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)] focus:ring-1 focus:ring-[var(--color-status-danger)]';
  }
  return 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]';
}

interface TagSelectOptionItemProps {
  option: TagOption;
  isSelected: boolean;
  isHighlighted: boolean;
  disabled: boolean;
  onToggle: (option: TagOption) => void;
  onMouseEnter: () => void;
}

function getOptionStateClass(
  isSelected: boolean,
  isHighlighted: boolean,
  isDisabled: boolean,
): string {
  if (isDisabled) {
    return 'opacity-40 cursor-not-allowed pointer-events-none text-[var(--color-text-muted)]';
  }
  if (isSelected) {
    return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold';
  }
  if (isHighlighted) {
    return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-main)]';
  }
  return 'text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)]';
}

function TagSelectOptionItem({
  option,
  isSelected,
  isHighlighted,
  disabled,
  onToggle,
  onMouseEnter,
}: TagSelectOptionItemProps) {
  const isOptionDisabled = disabled || option.disabled;
  const stateClass = getOptionStateClass(isSelected, isHighlighted, Boolean(isOptionDisabled));

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={isOptionDisabled}
      onMouseEnter={onMouseEnter}
      onClick={() => onToggle(option)}
      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-sans rounded-lg transition-colors text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${stateClass}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </div>
        {option.icon && <span className="shrink-0 text-current">{option.icon}</span>}
        <div className="min-w-0 flex-1">
          <span className="truncate block font-medium">{option.label}</span>
          {option.description && (
            <span className="text-[11px] text-[var(--color-text-muted)] block truncate mt-0.5 font-normal">
              {option.description}
            </span>
          )}
        </div>
      </div>

      {option.color && (
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0 ml-2"
          style={{
            backgroundColor: `var(--color-status-${option.color}, var(--color-${option.color}, #94a3b8))`,
          }}
        />
      )}
    </button>
  );
}

export function TagSelect({
  ref,
  id: externalId,
  label,
  error,
  placeholder = 'Select options...',
  options,
  value,
  onChange,
  searchPlaceholder = 'Search options...',
  emptyText = 'No options found',
  maxSelections,
  clearable = true,
  disabled = false,
  readOnly = false,
  containerClassName = '',
  popupClassName = '',
  className = '',
}: TagSelectProps) {
  const generatedId = useId();
  const selectId = externalId ?? generatedId;
  const searchInputId = `${selectId}-search`;

  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const { isOpen, toggle, close, triggerRef, popupRef, popupPosition } =
    usePopup<HTMLDivElement>('start');

  const optionsMap = useMemo(() => {
    const map = new Map<string, TagOption>();
    options.forEach(opt => map.set(opt.value, opt));
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(trimmed));
  }, [options, searchQuery]);

  const handleContainerRef = (element: HTMLDivElement | null) => {
    triggerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLDivElement | null }).current = element;
    }
  };

  const toggleOption = (option: TagOption) => {
    if (disabled || readOnly || option.disabled) return;

    if (value.includes(option.value)) {
      onChange(value.filter(v => v !== option.value));
    } else {
      if (maxSelections !== undefined && value.length >= maxSelections) {
        return;
      }
      onChange([...value, option.value]);
    }
  };

  const removeValue = (valToRemove: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (disabled || readOnly) return;
    onChange(value.filter(v => v !== valToRemove));
  };

  const handleClearAll = (e: MouseEvent) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    onChange([]);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;

    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) toggle();
    }
  };

  const handlePopupKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      return;
    }

    if (e.key === 'Enter' && filteredOptions[highlightedIndex]) {
      e.preventDefault();
      toggleOption(filteredOptions[highlightedIndex]);
    }
  };

  const borderClasses = getTriggerBorderClasses(Boolean(error));
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)]'
    : 'cursor-pointer';

  return (
    <div className={`space-y-1.5 text-left ${containerClassName}`.trim()}>
      {label && (
        <label
          htmlFor={selectId}
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
        ref={handleContainerRef}
        id={selectId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={!disabled && !readOnly ? toggle : undefined}
        onKeyDown={handleTriggerKeyDown}
        className={`flex items-center justify-between min-h-9 px-2.5 py-1 gap-1.5 rounded-lg border bg-[var(--color-surface)] shadow-xs transition-colors focus:outline-none ${borderClasses} ${disabledClasses} ${className}`.trim()}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-xs text-[var(--color-text-muted)] select-none">
              {placeholder}
            </span>
          ) : (
            value.map(val => {
              const opt = optionsMap.get(val);
              const optLabel = opt?.label ?? val;
              return (
                <Tag
                  key={val}
                  variant="subtle"
                  shape="rounded"
                  color={opt?.color}
                  onRemove={!disabled && !readOnly ? e => removeValue(val, e) : undefined}
                  removeAriaLabel={`Remove ${optLabel}`}
                  className="text-xs"
                >
                  {optLabel}
                </Tag>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[var(--color-text-muted)] ml-1">
          {clearable && value.length > 0 && !disabled && !readOnly && (
            <button
              type="button"
              aria-label="Clear all selections"
              onClick={handleClearAll}
              className="p-0.5 rounded hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label ?? 'Options'}
            onKeyDown={handlePopupKeyDown}
            style={{
              position: 'fixed',
              top: popupPosition?.top ?? 0,
              left: popupPosition?.left ?? 0,
              width: Math.max(popupPosition?.width ?? 0, 220),
              zIndex: 50,
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 font-sans select-none animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1.5 ${popupClassName}`.trim()}
          >
            {/* Search filter input */}
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="w-3.5 h-3.5 absolute left-2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-7 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-[var(--color-text-muted)]">
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => (
                  <TagSelectOptionItem
                    key={opt.value}
                    option={opt}
                    isSelected={value.includes(opt.value)}
                    isHighlighted={idx === highlightedIndex}
                    disabled={
                      !value.includes(opt.value) &&
                      maxSelections !== undefined &&
                      value.length >= maxSelections
                    }
                    onToggle={toggleOption}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  />
                ))
              )}
            </div>
          </div>,
          document.body,
        )}

      {error && (
        <p
          id={`${selectId}-error`}
          className="text-[11px] font-sans text-[var(--color-status-danger)] leading-tight"
        >
          {error}
        </p>
      )}
    </div>
  );
}
