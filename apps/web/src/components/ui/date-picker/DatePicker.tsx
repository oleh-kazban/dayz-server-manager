import { type CSSProperties, useEffect, useId } from 'react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';

import { Calendar, X } from 'lucide-react';

import { type Alignment, usePopup } from '@dsm/core/hooks';
import { formatDateOnly, parseDateOnly, toDateOnlyString } from '@dsm/core/utils';

import 'react-day-picker/style.css';

export interface DatePickerProps {
  value?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  triggerClassName?: string;
  className?: string;
  ariaLabel: string;
  alignment?: Alignment;
  disabled?: boolean;
  onChange: (_value: string | undefined) => void;
}

const DEFAULT_TRIGGER_CLASS =
  'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-surface-subtle)]';

export function DatePicker({
  value,
  minDate,
  maxDate,
  placeholder = 'Select date',
  triggerClassName,
  className = '',
  ariaLabel,
  alignment = 'start',
  disabled = false,
  onChange,
}: DatePickerProps) {
  const popupId = useId();
  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);
  const isPositioned = popupPosition !== null;
  const selected = value ? parseDateOnly(value) : undefined;
  const startDate = minDate ? parseDateOnly(minDate) : undefined;
  const endDate = maxDate ? parseDateOnly(maxDate) : undefined;

  useEffect(() => {
    if (isOpen && isPositioned) {
      popupRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    }
  }, [isOpen, isPositioned, popupRef]);

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? toDateOnlyString(date) : undefined);
    close();
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popupId}
        aria-label={value ? `${ariaLabel}: ${formatDateOnly(value)}` : ariaLabel}
        onClick={toggle}
        disabled={disabled}
        className={`inline-flex w-full items-center justify-between gap-2.5 disabled:cursor-not-allowed disabled:opacity-50 ${
          triggerClassName ?? DEFAULT_TRIGGER_CLASS
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <span className="truncate">{value ? formatDateOnly(value) : placeholder}</span>
        </div>
      </button>

      {value && !disabled && (
        <button
          type="button"
          aria-label="Clear date"
          onClick={e => {
            e.stopPropagation();
            handleSelect(undefined);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={popupId}
            role="dialog"
            aria-label={ariaLabel}
            className="fixed z-50 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-main)] shadow-[var(--shadow-card)]"
            style={
              {
                top: popupPosition?.top ?? 0,
                left: popupPosition?.left ?? 0,
                ...(popupPosition ? { maxHeight: popupPosition.maxHeight } : {}),
                visibility: popupPosition ? 'visible' : 'hidden',
                '--rdp-accent-color': 'var(--color-primary)',
                '--rdp-background-color': 'var(--color-surface-subtle)',
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
