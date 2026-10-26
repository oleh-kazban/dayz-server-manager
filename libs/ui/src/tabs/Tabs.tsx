import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import type {
  TabContentProps,
  TabItem,
  TabListProps,
  TabsProps,
  TabTriggerProps,
} from './Tabs.types';
import { TabsContext, useTabsContext } from './TabsContext';

/* --------------------------------------------------------------------------
   COUNT BADGE SUBCOMPONENT
   -------------------------------------------------------------------------- */

function getBadgeClasses(variant: 'segmented' | 'underline', isActive: boolean): string {
  if (isActive) {
    return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
  }
  if (variant === 'segmented') {
    return 'bg-[var(--color-surface)] text-[var(--color-text-muted)]';
  }
  return 'bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50';
}

function getTriggerVariantStyles(variant: 'segmented' | 'underline', isActive: boolean): string {
  if (variant === 'segmented') {
    return isActive
      ? 'bg-[var(--color-surface)] text-[var(--color-text-main)] font-semibold shadow-xs border border-[var(--color-border)]/60'
      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)]/50 border border-transparent';
  }
  return isActive
    ? 'text-[var(--color-primary)] font-semibold border-b-2 border-[var(--color-primary)]'
    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border-b-2 border-transparent hover:border-[var(--color-border)]';
}

function TabCountBadge({
  count,
  isActive,
  variant,
}: {
  count: number | string;
  isActive: boolean;
  variant: 'segmented' | 'underline';
}) {
  const badgeClasses = getBadgeClasses(variant, isActive);

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono leading-none rounded-full transition-colors ${badgeClasses}`}
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

/* --------------------------------------------------------------------------
   TAB TRIGGER
   -------------------------------------------------------------------------- */

export function TabTrigger({
  ref,
  value,
  children,
  icon,
  count,
  disabled = false,
  className = '',
}: TabTriggerProps) {
  const { activeValue, setActiveValue, variant, fullWidth, baseId, tabRefs, orderedTabValues } =
    useTabsContext();

  const internalButtonRef = useRef<HTMLButtonElement | null>(null);
  const isActive = activeValue === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  // Register in DOM order for arrow navigation
  useEffect(() => {
    const currentRefs = tabRefs.current;
    if (!orderedTabValues.current.includes(value)) {
      orderedTabValues.current.push(value);
    }
    return () => {
      orderedTabValues.current = orderedTabValues.current.filter(v => v !== value);
      currentRefs.delete(value);
    };
  }, [value, orderedTabValues, tabRefs]);

  const handleRef = (element: HTMLButtonElement | null) => {
    internalButtonRef.current = element;
    tabRefs.current.set(value, element);

    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLButtonElement | null }).current = element;
    }
  };

  const handleClick = () => {
    if (disabled) return;
    setActiveValue(value);
  };

  // Base styling per variant
  const variantStyles = getTriggerVariantStyles(variant, isActive);

  const sizeStyles = variant === 'segmented' ? 'h-8 px-3 rounded-lg' : 'h-9 px-1.5';

  return (
    <button
      ref={handleRef}
      id={tabId}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 text-xs font-sans whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${
        fullWidth ? 'flex-1' : ''
      } ${className}`.trim()}
    >
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      <span className="truncate">{children}</span>
      {count !== undefined && <TabCountBadge count={count} isActive={isActive} variant={variant} />}
    </button>
  );
}

/* --------------------------------------------------------------------------
   TAB LIST
   -------------------------------------------------------------------------- */

export function TabList({ ref, 'aria-label': ariaLabel, children, className = '' }: TabListProps) {
  const { variant, fullWidth, tabRefs, orderedTabValues, setActiveValue } = useTabsContext();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const values = orderedTabValues.current;
    if (values.length === 0) return;

    const focusedValue = values.find(val => tabRefs.current.get(val) === document.activeElement);
    if (!focusedValue) return;

    const currentIndex = values.indexOf(focusedValue);
    let nextIndex: number | null = null;

    const findNextEnabled = (startIndex: number, step: 1 | -1): number | null => {
      let count = 0;
      let curr = startIndex;
      while (count < values.length) {
        curr = (curr + step + values.length) % values.length;
        const elem = tabRefs.current.get(values[curr]);
        if (elem && !elem.disabled) {
          return curr;
        }
        count++;
      }
      return null;
    };

    const findFirstEnabled = (): number | null => {
      for (let i = 0; i < values.length; i++) {
        const elem = tabRefs.current.get(values[i]);
        if (elem && !elem.disabled) return i;
      }
      return null;
    };

    const findLastEnabled = (): number | null => {
      for (let i = values.length - 1; i >= 0; i--) {
        const elem = tabRefs.current.get(values[i]);
        if (elem && !elem.disabled) return i;
      }
      return null;
    };

    if (event.key === 'ArrowRight') {
      nextIndex = findNextEnabled(currentIndex, 1);
    } else if (event.key === 'ArrowLeft') {
      nextIndex = findNextEnabled(currentIndex, -1);
    } else if (event.key === 'Home') {
      nextIndex = findFirstEnabled();
    } else if (event.key === 'End') {
      nextIndex = findLastEnabled();
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextValue = values[nextIndex];
      const targetElement = tabRefs.current.get(nextValue);

      if (targetElement && !targetElement.disabled) {
        targetElement.focus();
        setActiveValue(nextValue);
      }
    }
  };

  const baseContainerStyles =
    variant === 'segmented'
      ? 'inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] shadow-xs'
      : 'flex items-center gap-6 border-b border-[var(--color-border)]';
  const widthStyle = fullWidth ? 'w-full' : '';
  const containerStyles = `${baseContainerStyles} ${widthStyle}`.trim();

  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`${containerStyles} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   TAB CONTENT (PANEL)
   -------------------------------------------------------------------------- */

export function TabContent({
  ref,
  value,
  children,
  className = '',
  forceMount = false,
}: TabContentProps) {
  const { activeValue, baseId } = useTabsContext();
  const isActive = activeValue === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      ref={ref}
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      hidden={!isActive}
      className={`focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded-lg ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   PRIMARY TABS WRAPPER
   -------------------------------------------------------------------------- */

export function Tabs({
  ref,
  value,
  defaultValue,
  onChange,
  variant = 'segmented',
  items,
  children,
  fullWidth = false,
  ariaLabel,
  containerClassName = '',
}: TabsProps) {
  const generatedId = useId();
  const isControlled = value !== undefined;

  const initialValue = defaultValue ?? items?.[0]?.id ?? '';
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(initialValue);
  const activeValue = isControlled ? value : uncontrolledValue;

  const tabRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const orderedTabValues = useRef<string[]>([]);

  const handleSetActiveValue = (nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const contextValue = {
    activeValue,
    setActiveValue: handleSetActiveValue,
    variant,
    fullWidth,
    baseId: generatedId,
    tabRefs,
    orderedTabValues,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div ref={ref} className={`space-y-4 ${containerClassName}`.trim()}>
        {items && items.length > 0 ? (
          <TabList aria-label={ariaLabel}>
            {items.map((item: TabItem) => (
              <TabTrigger
                key={item.id}
                value={item.id}
                icon={item.icon}
                count={item.count}
                disabled={item.disabled}
              >
                {item.label as ReactNode}
              </TabTrigger>
            ))}
          </TabList>
        ) : null}
        {children}
      </div>
    </TabsContext.Provider>
  );
}
