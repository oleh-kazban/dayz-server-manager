import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Check, ChevronDown, X } from 'lucide-react';

import { usePopup } from '../hooks';

import { type SelectOption, type SelectProps } from './Select.types';

function getTriggerBorderClasses(hasError: boolean): string {
  if (hasError) {
    return 'border-[var(--color-status-danger)] focus-within:border-[var(--color-status-danger)] focus-within:ring-1 focus-within:ring-[var(--color-status-danger)]';
  }
  return 'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]';
}

function getOptionItemClasses(
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

function renderTriggerContent<T>(
  selectedOption: SelectOption<T> | null,
  placeholder: string,
  customRenderValue?: (option: SelectOption<T> | null) => ReactNode,
): ReactNode {
  if (customRenderValue) {
    return <span className="truncate">{customRenderValue(selectedOption)}</span>;
  }
  if (selectedOption) {
    return (
      <span className="truncate text-[var(--color-text-main)] flex items-center gap-2">
        {selectedOption.icon && (
          <span className="shrink-0 text-current">{selectedOption.icon}</span>
        )}
        <span className="truncate">{selectedOption.label}</span>
      </span>
    );
  }
  return <span className="truncate text-[var(--color-text-muted)] select-none">{placeholder}</span>;
}

function findNextEnabled<T>(options: SelectOption<T>[], startIndex: number, step: 1 | -1): number {
  if (options.length === 0) return -1;
  let count = 0;
  let curr = startIndex;
  while (count < options.length) {
    curr = (curr + step + options.length) % options.length;
    if (!options[curr].disabled) {
      return curr;
    }
    count++;
  }
  return -1;
}

function findFirstEnabled<T>(options: SelectOption<T>[]): number {
  for (let i = 0; i < options.length; i++) {
    if (!options[i].disabled) return i;
  }
  return -1;
}

function findLastEnabled<T>(options: SelectOption<T>[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i].disabled) return i;
  }
  return -1;
}

function getNavigatedIndex<T>(
  key: string,
  options: SelectOption<T>[],
  currentIndex: number,
): number | null {
  switch (key) {
    case 'ArrowDown':
      return findNextEnabled(options, currentIndex, 1);
    case 'ArrowUp':
      return findNextEnabled(options, currentIndex, -1);
    case 'Home':
      return findFirstEnabled(options);
    case 'End':
      return findLastEnabled(options);
    default:
      return null;
  }
}

function assignRef<T>(ref: Ref<T> | undefined, element: T | null) {
  if (typeof ref === 'function') {
    ref(element);
  } else if (ref && 'current' in ref) {
    (ref as { current: T | null }).current = element;
  }
}

interface SelectKeyDownParams<T> {
  event: KeyboardEvent<HTMLButtonElement>;
  disabled: boolean;
  isOpen: boolean;
  options: SelectOption<T>[];
  highlightedIndex: number;
  setHighlightedIndex: (value: number | ((prev: number) => number)) => void;
  selectOption: (option: SelectOption<T>) => void;
  open: () => void;
  close: () => void;
  focusButton: () => void;
}

function handleSelectKeyDown<T>({
  event,
  disabled,
  isOpen,
  options,
  highlightedIndex,
  setHighlightedIndex,
  selectOption,
  open,
  close,
  focusButton,
}: SelectKeyDownParams<T>) {
  if (disabled) return;

  if (!isOpen) {
    const isNavigationKey =
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' ';

    if (isNavigationKey) {
      event.preventDefault();
      open();
    }
    return;
  }

  const navIndex = getNavigatedIndex(event.key, options, highlightedIndex);
  if (navIndex !== null) {
    event.preventDefault();
    setHighlightedIndex(navIndex);
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const option = options[highlightedIndex];
    if (option && !option.disabled) {
      selectOption(option);
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    focusButton();
    return;
  }

  if (event.key === 'Tab') {
    close();
  }
}

interface OptionListItemProps<T> {
  id: string;
  option: SelectOption<T>;
  isSelected: boolean;
  isHighlighted: boolean;
  onHighlight: () => void;
  onSelect: () => void;
  renderOption?: (
    option: SelectOption<T>,
    isSelected: boolean,
    isHighlighted: boolean,
  ) => ReactNode;
}

function OptionListItem<T>({
  id,
  option,
  isSelected,
  isHighlighted,
  onHighlight,
  onSelect,
  renderOption,
}: OptionListItemProps<T>) {
  const itemClass = getOptionItemClasses(isSelected, isHighlighted, Boolean(option.disabled));

  return (
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={option.disabled}
      onMouseEnter={() => {
        if (!option.disabled) {
          onHighlight();
        }
      }}
      onClick={() => {
        if (!option.disabled) {
          onSelect();
        }
      }}
      className={`flex items-center justify-between px-3 py-2 text-xs font-sans rounded-lg cursor-pointer transition-colors ${itemClass}`}
    >
      {renderOption ? (
        renderOption(option, isSelected, isHighlighted)
      ) : (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {option.icon && <span className="shrink-0 text-current">{option.icon}</span>}
          <div className="min-w-0 flex-1">
            <span className="truncate block">{option.label}</span>
            {option.description && (
              <span className="text-[11px] text-[var(--color-text-muted)] block truncate mt-0.5">
                {option.description}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {option.badge !== undefined && (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50">
            {option.badge}
          </span>
        )}
        {isSelected && <Check aria-hidden="true" className="w-4 h-4 text-[var(--color-primary)]" />}
      </div>
    </li>
  );
}

interface SelectPopupProps<T> {
  isOpen: boolean;
  popupRef: Ref<HTMLDivElement>;
  popupPosition: {
    top: number;
    left: number;
    width?: number;
    maxWidth?: number;
    maxHeight?: number;
  } | null;
  popupClassName: string;
  options: SelectOption<T>[];
  emptyText: string;
  listboxId: string;
  optionsListRef: Ref<HTMLUListElement>;
  label?: string;
  ariaLabel?: string;
  activeValue: T | null;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (option: SelectOption<T>) => void;
  renderOption?: (
    option: SelectOption<T>,
    isSelected: boolean,
    isHighlighted: boolean,
  ) => ReactNode;
}

function SelectPopup<T>({
  isOpen,
  popupRef,
  popupPosition,
  popupClassName,
  options,
  emptyText,
  listboxId,
  optionsListRef,
  label,
  ariaLabel,
  activeValue,
  highlightedIndex,
  onHighlight,
  onSelect,
  renderOption,
}: SelectPopupProps<T>) {
  if (!isOpen) return null;

  const popupWidth = popupPosition ? `${popupPosition.width}px` : 'auto';
  const popupMaxWidth = popupPosition ? `${popupPosition.maxWidth}px` : 'none';
  const popupMaxHeight = popupPosition ? `${popupPosition.maxHeight}px` : undefined;
  const popupTop = popupPosition ? `${popupPosition.top}px` : '0px';
  const popupLeft = popupPosition ? `${popupPosition.left}px` : '0px';

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: popupTop,
        left: popupLeft,
        width: popupWidth,
        maxWidth: popupMaxWidth,
        maxHeight: popupMaxHeight,
        visibility: popupPosition ? 'visible' : 'hidden',
      }}
      className={`z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg p-1 overflow-y-auto ${popupClassName}`.trim()}
    >
      {options.length === 0 ? (
        <div className="px-3 py-4 text-xs text-center text-[var(--color-text-muted)] select-none">
          {emptyText}
        </div>
      ) : (
        <ul
          ref={optionsListRef}
          id={listboxId}
          role="listbox"
          aria-label={label ?? ariaLabel ?? 'Options'}
          tabIndex={-1}
          className="space-y-0.5 outline-none"
        >
          {options.map((option, index) => (
            <OptionListItem
              key={String(option.value)}
              id={`${listboxId}-opt-${index}`}
              option={option}
              isSelected={option.value === activeValue}
              isHighlighted={index === highlightedIndex}
              onHighlight={() => onHighlight(index)}
              onSelect={() => onSelect(option)}
              renderOption={renderOption}
            />
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}

export function Select<T = string>({
  ref,
  id: externalId,
  name,
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  placeholder = 'Select an option...',
  clearable = false,
  leftIcon: LeftIcon,
  options,
  value,
  defaultValue,
  onChange,
  renderOption,
  renderValue,
  emptyText = 'No options available',
  'aria-label': ariaLabel,
  className = '',
  popupClassName = '',
  containerClassName = '',
  customClassName = '',
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = externalId ?? generatedId;
  const listboxId = `${selectId}-listbox`;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<T | null>(defaultValue ?? null);
  const activeValue = isControlled ? value : uncontrolledValue;

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const optionsListRef = useRef<HTMLUListElement>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    isOpen,
    open,
    close,
    toggle,
    popupPosition,
    containerRef,
    triggerRef,
    popupRef,
    updatePosition,
  } = usePopup<HTMLDivElement>('start');

  const selectedOption = options.find(opt => opt.value === activeValue) ?? null;

  const handleButtonRef = useCallback(
    (element: HTMLButtonElement | null) => {
      buttonRef.current = element;
      assignRef(ref, element);
    },
    [ref],
  );

  // Sync position when open and options change
  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, options, updatePosition]);

  // Close if select gets disabled while open
  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  const selectOption = useCallback(
    (option: SelectOption<T> | null) => {
      if (disabled) return;
      const nextVal = option ? option.value : null;

      if (!isControlled) {
        setUncontrolledValue(nextVal);
      }
      onChange?.(nextVal, option);
      close();
      buttonRef.current?.focus();
    },
    [disabled, isControlled, onChange, close],
  );

  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    selectOption(null);
  };

  // Open with highlighted selection or first enabled
  const handleOpen = useCallback(() => {
    if (disabled) return;
    const selectedIdx = options.findIndex(opt => opt.value === activeValue && !opt.disabled);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : findFirstEnabled(options));
    open();
  }, [disabled, options, activeValue, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    handleSelectKeyDown({
      event,
      disabled,
      isOpen,
      options,
      highlightedIndex,
      setHighlightedIndex,
      selectOption,
      open: handleOpen,
      close,
      focusButton: () => buttonRef.current?.focus(),
    });
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    buttonRef.current?.focus();
    toggle();
  };

  // Scroll active option into view inside dropdown
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
      const optionElement = optionsListRef.current.children[highlightedIndex] as HTMLElement;
      optionElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, highlightedIndex]);

  const resolvedContainerClass = containerClassName || customClassName || '';
  const containerWidthClass = /\bw-\S+/.test(resolvedContainerClass) ? '' : 'w-full';
  const borderClasses = getTriggerBorderClasses(Boolean(error));

  const describedBy =
    [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div
      ref={containerRef}
      className={`space-y-1.5 text-left ${containerWidthClass} ${resolvedContainerClass}`.trim()}
    >
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
          {required && <span className="ml-0.5 text-[var(--color-status-danger)]">*</span>}
        </label>
      )}

      {name && (
        <input
          type="hidden"
          name={name}
          value={activeValue !== null && activeValue !== undefined ? String(activeValue) : ''}
        />
      )}

      <div
        ref={triggerRef}
        onClick={handleContainerClick}
        className={`w-full flex items-center justify-between rounded-lg border bg-[var(--color-surface)] shadow-xs transition-colors h-9 px-3.5 gap-2 text-xs font-sans text-left ${borderClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)]' : ''
        } ${className}`.trim()}
      >
        <button
          ref={handleButtonRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined
          }
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className="flex-1 flex items-center justify-between min-w-0 bg-transparent outline-none cursor-pointer disabled:cursor-not-allowed gap-2 text-left py-1"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {LeftIcon && (
              <LeftIcon
                aria-hidden="true"
                className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 select-none"
              />
            )}

            {renderTriggerContent(selectedOption, placeholder, renderValue)}
          </div>

          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 select-none shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {clearable && selectedOption && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={handleClear}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <SelectPopup
        isOpen={isOpen}
        popupRef={popupRef}
        popupPosition={popupPosition}
        popupClassName={popupClassName}
        options={options}
        emptyText={emptyText}
        listboxId={listboxId}
        optionsListRef={optionsListRef}
        label={label}
        ariaLabel={ariaLabel}
        activeValue={activeValue}
        highlightedIndex={highlightedIndex}
        onHighlight={setHighlightedIndex}
        onSelect={selectOption}
        renderOption={renderOption}
      />

      {error && (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-status-danger)]">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p id={helperId} className="text-xs text-[var(--color-text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
