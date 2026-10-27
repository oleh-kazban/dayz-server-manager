import { type CSSProperties, type FormEvent, useEffect, useId, useState } from 'react';
import { type ClassNames, DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';

import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { usePopup } from '../hooks';
import { formatDateOnly, parseDateOnly, toDateOnlyString } from '../utils';

import type { DatePickerProps } from './DatePicker.types';

import 'react-day-picker/style.css';

const RDP_CLASS_NAMES: Partial<ClassNames> = {
  root: 'p-3 font-sans text-xs',
  months: 'relative',
  month: 'space-y-2',
  month_caption: 'flex items-center justify-center h-7 mb-2',
  caption_label: 'text-xs font-semibold text-[var(--color-text-main)] select-none',
  nav: 'flex items-center justify-between absolute inset-x-0 top-0 h-7 pointer-events-none z-10',
  button_previous:
    'pointer-events-auto h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
  button_next:
    'pointer-events-auto h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
  month_grid: 'w-full border-collapse',
  weekdays: '',
  weekday:
    'w-8 h-7 text-center align-middle text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider select-none',
  weeks: '',
  week: '',
  day: 'w-8 h-8 text-center align-middle p-0',
  day_button:
    'w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-xs font-normal text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] select-none',
  today: '[&>button]:font-semibold [&>button]:text-[var(--color-primary)]',
  selected:
    '[&>button]:bg-[var(--color-primary)] [&>button]:text-white [&>button]:font-medium [&>button]:hover:bg-[var(--color-primary-hover)]',
  outside: '[&>button]:opacity-35 [&>button]:text-[var(--color-text-muted)]',
  disabled: '[&>button]:opacity-25 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
  hidden: 'invisible',
};

function getFormValidationMessage(validity: ValidityState): string {
  return validity.valueMissing ? 'A date is required.' : 'Select a date within the allowed range.';
}

function getCurrentFormValidationMessage(
  validation: { value: string; message: string } | null,
  value: string | undefined,
): string | undefined {
  return validation?.value === (value ?? '') ? validation.message : undefined;
}

function getTriggerAccessibleName(ariaLabel: string, value: string | undefined, required: boolean) {
  const name = value ? `${ariaLabel}: ${formatDateOnly(value)}` : ariaLabel;
  return required ? `${name} (required)` : name;
}

export function DatePicker({
  ref,
  id: externalId,
  name,
  value,
  minDate,
  maxDate,
  placeholder = 'Select date',
  label,
  error,
  customClassName = '',
  containerClassName = '',
  ariaLabel = 'Select date',
  alignment = 'start',
  disabled = false,
  required = false,
  onChange,
  onBlur,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const popupId = useId();
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);
  const isPopupOpen = !disabled && isOpen;
  const isPositioned = popupPosition !== null;
  const [formValidation, setFormValidation] = useState<{ value: string; message: string } | null>(
    null,
  );
  const selected = value ? parseDateOnly(value) : undefined;
  const startDate = minDate ? parseDateOnly(minDate) : undefined;
  const endDate = maxDate ? parseDateOnly(maxDate) : undefined;
  const formValidationMessage = getCurrentFormValidationMessage(formValidation, value);
  const displayedError = error ?? formValidationMessage;

  const handleTriggerRef = (element: HTMLButtonElement | null) => {
    triggerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLButtonElement | null }).current = element;
    }
  };

  useEffect(() => {
    if (isPopupOpen && isPositioned) {
      popupRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    }
  }, [isPopupOpen, isPositioned, popupRef]);

  // Dismiss popup if component becomes disabled while open
  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  const handleSelect = (date: Date | undefined) => {
    if (disabled) return;
    setFormValidation(null);
    onChange(date ? toDateOnlyString(date) : undefined);
    close();
    triggerRef.current?.focus();
  };

  const handleFormInvalid = (event: FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    setFormValidation({
      value: value ?? '',
      message: getFormValidationMessage(event.currentTarget.validity),
    });
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-1.5 text-left ${containerClassName || customClassName}`.trim()}
    >
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

      <div className="relative">
        <input
          type="date"
          name={name}
          value={value ?? ''}
          min={minDate}
          max={maxDate}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => {}}
          onInvalid={handleFormInvalid}
          className="sr-only"
        />
        <button
          ref={handleTriggerRef}
          id={inputId}
          name={name}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isPopupOpen}
          aria-controls={popupId}
          aria-label={getTriggerAccessibleName(ariaLabel, value, required)}
          aria-invalid={Boolean(displayedError)}
          aria-describedby={displayedError ? `${inputId}-error` : undefined}
          onClick={toggle}
          onBlur={onBlur}
          disabled={disabled}
          className={`inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-[var(--color-surface)] shadow-xs font-sans text-xs text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            value && !disabled ? 'pl-3.5 pr-8' : 'px-3.5'
          } ${
            displayedError
              ? 'border-[var(--color-status-danger)] focus-visible:border-[var(--color-status-danger)] focus-visible:ring-1 focus-visible:ring-[var(--color-status-danger)]'
              : 'border-[var(--color-border)] focus-visible:border-[var(--color-primary)] focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            <span className="truncate">{value ? formatDateOnly(value) : placeholder}</span>
          </span>
        </button>

        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={e => {
              e.stopPropagation();
              handleSelect(undefined);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {displayedError && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] font-sans text-[var(--color-text-main)] leading-tight"
        >
          {displayedError}
        </p>
      )}

      {isPopupOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label={ariaLabel}
            className="fixed z-50 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] font-sans text-xs text-[var(--color-text-main)] shadow-[var(--shadow-card)] [&_.rdp-month_caption]:text-xs [&_.rdp-month_caption]:font-semibold [&_.rdp-weekday]:text-[10px] [&_.rdp-weekday]:font-medium [&_.rdp-day]:text-xs [&_.rdp-selected]:text-xs"
            style={
              {
                top: popupPosition?.top ?? 0,
                left: popupPosition?.left ?? 0,
                ...(popupPosition
                  ? {
                      maxHeight: popupPosition.maxHeight,
                      maxWidth: popupPosition.maxWidth,
                    }
                  : {}),
                visibility: popupPosition ? 'visible' : 'hidden',
                '--rdp-day-height': '28px',
                '--rdp-day-width': '28px',
                '--rdp-day_button-height': '28px',
                '--rdp-day_button-width': '28px',
                '--rdp-nav-height': '28px',
                '--rdp-nav_button-height': '28px',
                '--rdp-nav_button-width': '28px',
                '--rdp-accent-color': 'var(--color-primary)',
                '--rdp-accent-background-color': 'var(--color-primary-light)',
              } as CSSProperties
            }
            data-placement={popupPosition?.placement}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected}
              startMonth={startDate}
              endMonth={endDate}
              classNames={RDP_CLASS_NAMES}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ),
              }}
              disabled={[
                ...(startDate ? [{ before: startDate }] : []),
                ...(endDate ? [{ after: endDate }] : []),
              ]}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
